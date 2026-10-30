import mongoose from 'mongoose';
import EducationDetails from '../model/educationmodel.js';

const isValidAcademicName = value => {
  const text = String(value ?? '').trim();
  return !text || (/^[\p{L}][\p{L}\p{N}\s&.,'()/-]{1,119}$/u.test(text) && (text.match(/\d/g) || []).length <= 2);
};
const isValidInstitutionName = value => {
  const text = String(value ?? '').trim();
  return !text || /^[\p{L}][\p{L}\s&.,'()/-]{1,119}$/u.test(text);
};
const isValidLocation = value => {
  const text = String(value ?? '').trim();
  return !text || /^[\p{L}][\p{L}\s.'-]{1,79}$/u.test(text);
};
const isValidYear = value => {
  const text = String(value ?? '').trim();
  if (!text) return true;
  const year = Number(text);
  return /^\d{4}$/.test(text) && year >= 1950 && year <= new Date().getFullYear() + 10;
};
const isValidScore = value => {
  const text = String(value ?? '').trim();
  if (!text) return true;
  const number = '(?:\\d{1,3})(?:\\.\\d{1,2})?';
  if (!new RegExp(`^${number}%?$`).test(text) && !new RegExp(`^${number}\\s*\\/\\s*${number}$`).test(text)) return false;
  const values = text.split('/').map(part => Number(part.replace('%', '').trim()));
  return values.every(n => Number.isFinite(n) && n >= 0) && (text.includes('/') ? values[0] <= values[1] : values[0] <= 100);
};
const isValidYearRange = (details, endField) => {
  const start = String(details?.startYear ?? '').trim();
  const end = String(details?.[endField] ?? '').trim();
  return isValidYear(start) && isValidYear(end) && (!start || !end || Number(start) <= Number(end));
};
const validateEducationSection = (details, { names = [], institutionNames = [], locations = [], years = [], scores = [] } = {}) => {
  if (!details) return true;
  return names.every(field => isValidAcademicName(details[field])) &&
    institutionNames.every(field => isValidInstitutionName(details[field])) &&
    locations.every(field => isValidLocation(details[field])) &&
    years.every(([startField, endField]) => isValidYearRange({ ...details, startYear: details[startField] }, endField)) &&
    scores.every(field => isValidScore(details[field]));
};

export const getEducationDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const details = await EducationDetails.findOne({ userId });
    
    if (!details) {
      return res.status(200).json({ success: true, data: null, message: "No education details found." });
    }

    res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error("Error fetching education details:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

export const saveEducationDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { 
      bachelorDetails, 
      transferDetails, 
      masterDetails, 
      medicalDetails, 
      educationDetails, 
      applicantType, 
      applyingFor 
    } = req.body;

    const invalidEducation =
      (applyingFor === "Bachelor's" && !validateEducationSection(bachelorDetails, {
        institutionNames: ['schoolName'], locations: ['country', 'state'],
        years: [['startYear', 'completionYear']], scores: ['percentage']
      })) ||
      (applyingFor === "Master's" && !validateEducationSection(masterDetails, {
        names: ['courseMajor'], institutionNames: ['university'], locations: ['country', 'state'],
        years: [['startYear', 'graduationYear']], scores: ['gpa']
      })) ||
      (applyingFor === 'Medical' && !validateEducationSection(medicalDetails, {
        names: ['course'], institutionNames: ['schoolCollege', 'institution'], locations: ['country', 'state'],
        years: [['startYear', 'completionYear']], scores: ['percentageGpa']
      })) ||
      (applicantType === 'Transfer Student' && (
        !validateEducationSection(transferDetails, {
          names: applyingFor === "Bachelor's" ? ['currentProgram', 'major'] : [],
          institutionNames: ['currentCollege'],
          scores: applyingFor === "Bachelor's" ? ['gpa'] : []
        }) ||
        (applyingFor === "Bachelor's" && transferDetails?.creditsCompleted && (!/^\d{1,3}(?:\.\d{1,2})?$/.test(String(transferDetails.creditsCompleted)) || Number(transferDetails.creditsCompleted) <= 0 || Number(transferDetails.creditsCompleted) > 300)) ||
        (applyingFor === "Bachelor's" && transferDetails?.startDate && transferDetails?.endDate && transferDetails.startDate > transferDetails.endDate)
      ));

    if (invalidEducation) {
      return res.status(400).json({ success: false, message: 'Please correct invalid education names, locations, years, scores, or credits before saving.' });
    }

    const updatePayload = {
      userId,
      status: 'Completed'
    };

    if (bachelorDetails) updatePayload.bachelorDetails = bachelorDetails;
    if (transferDetails) updatePayload.transferDetails = transferDetails;
    if (masterDetails) updatePayload.masterDetails = masterDetails;
    if (medicalDetails) updatePayload.medicalDetails = medicalDetails;
    if (applicantType) updatePayload.applicantType = applicantType;
    if (applyingFor) updatePayload.applyingFor = applyingFor;

    if (Array.isArray(educationDetails)) {
      updatePayload.educationDetails = educationDetails.map(edu => {
        const sanitized = { ...edu };
        if (sanitized.id && !mongoose.Types.ObjectId.isValid(sanitized.id)) {
          delete sanitized.id;
        }
        return sanitized;
      });
    }

    const updatedDetails = await EducationDetails.findOneAndUpdate(
      { userId },
      updatePayload,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ 
      success: true, 
      message: "Education details saved successfully", 
      data: updatedDetails 
    });
  } catch (error) {
    console.error("Error saving education details:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

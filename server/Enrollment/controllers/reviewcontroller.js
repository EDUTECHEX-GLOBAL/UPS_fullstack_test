import FirstYearReview from '../model/reviewmodel.js';
import PersonalDetails from '../model/personalmodel.js';
import EducationDetails from '../model/educationmodel.js';
import TestScores from '../model/testmodel.js';
import { getPresignedUrl } from '../../middleware/uploadMiddleware.js';
import Account from '../../models/accountModel.js';
import AdditionalDocument from '../model/additionaldocumentmodel.js';

// Helper to generate Application Number: APP-2026-XXXXX
const generateApplicationNumber = () => {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000); // 5 digits
  return `APP-${year}-${randomSuffix}`;
};

// GET /api/enrollment/review - Aggregate all application sections for review
export const getReviewSummary = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [personal, education, test, review, account, additionalDocuments] = await Promise.all([
      PersonalDetails.findOne({ userId }),
      EducationDetails.findOne({ userId }),
      TestScores.findOne({ userId }),
      FirstYearReview.findOne({ userId }),
      Account.findById(userId),
      AdditionalDocument.find({ userId, status: 'Uploaded' }).lean()
    ]);

    const accountData = account ? account.toObject() : {};
    const testScoresData = test ? test.toObject() : {};
    for (const score of testScoresData.tests || []) {
      if (score.reportFile?.s3Key) {
        try {
          score.reportFile.fileUrl = await getPresignedUrl(score.reportFile.s3Key, 86400);
        } catch (error) {
          console.error('Unable to create score report link for review:', error);
        }
      }
    }

    const personalData = personal ? personal.toObject() : {};
    personalData.email = accountData.email || personalData.email || req.user?.email || '';
    personalData.firstName = accountData.firstName || personalData.firstName || '';
    personalData.lastName = accountData.lastName || personalData.lastName || '';
    personalData.phone = accountData.phone || personalData.phone || personalData.mobile || '';
    personalData.applicantType = accountData.applicantType || 'First-Year Student';
    personalData.applyingFor = accountData.applyingFor || "Bachelor's";

    const additionalDocumentsWithUrls = await Promise.all(additionalDocuments.map(async (document) => {
      const file = document.file || {};
      let fileUrl = file.fileUrl || '';
      const s3Key = file.s3Key || file.fileKey;
      if (s3Key) {
        try { fileUrl = await getPresignedUrl(s3Key, 86400); }
        catch (error) { console.error('Unable to create additional document link for review:', error); }
      }
      return {
        id: String(document._id),
        documentType: document.documentType,
        documentName: document.documentName,
        studyType: document.studyType,
        file: { ...file, fileUrl }
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        accountInfo: {
          firstName: accountData.firstName || '',
          lastName: accountData.lastName || '',
          email: accountData.email || '',
          phone: accountData.phone || '',
          applicantType: accountData.applicantType || 'First-Year Student',
          applyingFor: accountData.applyingFor || "Bachelor's",
          applicationNumber: accountData.applicationNumber || '',
          applicationStatus: accountData.applicationStatus || 'Draft',
          isLocked: accountData.isLocked || false,
          submittedAt: accountData.submittedAt || null,
          changesRequestedNotes: accountData.changesRequestedNotes || '',
          changesRequestedSection: accountData.changesRequestedSection || ''
        },
        personalDetails: personalData,
        educationDetails: education ? education.toObject() : {},
        additionalDocuments: additionalDocumentsWithUrls,
        testScores: testScoresData,
        reviewStatus: review ? review.toObject() : { status: accountData.applicationStatus || 'Draft' }
      }
    });
  } catch (error) {
    console.error("Error fetching review summary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch review summary", error: error.message });
  }
};

// POST /api/enrollment/save-draft
export const saveDraftApplication = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const {
      currentStep = 1,
      personalDetails,
      educationDetails,
      testScores,
      applicantType,
      applyingFor
    } = req.body;

    // 1. Save Personal Details draft if provided
    if (personalDetails && typeof personalDetails === 'object') {
      await PersonalDetails.findOneAndUpdate(
        { userId },
        { ...personalDetails, userId, status: 'In Progress' },
        { new: true, upsert: true }
      );
    }

    // 2. Save Education Details draft if provided
    if (educationDetails && typeof educationDetails === 'object') {
      await EducationDetails.findOneAndUpdate(
        { userId },
        { ...educationDetails, userId, status: 'In Progress' },
        { new: true, upsert: true }
      );
    }

    // 3. Save Test Scores draft if provided
    if (testScores && typeof testScores === 'object') {
      await TestScores.findOneAndUpdate(
        { userId },
        { ...testScores, userId, status: 'In Progress' },
        { new: true, upsert: true }
      );
    }

    // 4. Update Account metadata
    const accountUpdates = {
      draftSavedStep: Number(currentStep) || 1,
      applicationStatus: 'Draft'
    };
    if (applicantType) accountUpdates.applicantType = applicantType;
    if (applyingFor) accountUpdates.applyingFor = applyingFor;

    await Account.findByIdAndUpdate(userId, accountUpdates);

    res.status(200).json({
      success: true,
      message: "Application draft saved successfully. You can safely return later to complete it.",
      currentStep: Number(currentStep) || 1
    });
  } catch (error) {
    console.error("Error saving draft application:", error);
    res.status(500).json({ success: false, message: "Failed to save draft", error: error.message });
  }
};

// POST /api/enrollment/submit-for-approval
export const submitForApproval = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { confirmedAccuracy } = req.body;

    if (!confirmedAccuracy) {
      return res.status(400).json({
        success: false,
        message: "You must confirm that the information provided is accurate and complete."
      });
    }

    const [account, personal, education, test] = await Promise.all([
      Account.findById(userId),
      PersonalDetails.findOne({ userId }),
      EducationDetails.findOne({ userId }),
      TestScores.findOne({ userId })
    ]);

    if (!account) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    if (account.isLocked && account.applicationStatus === 'Submitted for Approval') {
      return res.status(200).json({ success: true, message: 'Application was already submitted for approval.', applicationNumber: account.applicationNumber || '', submittedAt: account.submittedAt || null, status: account.applicationStatus });
    }

    // Validation checks
    const missing = [];
    if (!personal || (!personal.fatherFirstName && !personal.fatherName)) missing.push("Father's Name");
    if (!personal || !personal.fatherPhone) missing.push("Father's Phone Number (10 digits)");
    if (!personal || !personal.fatherEmail) missing.push("Father's Email");
    if (!personal || (!personal.motherFirstName && !personal.motherName)) missing.push("Mother's Name");
    if (!personal || !personal.motherPhone) missing.push("Mother's Phone Number (10 digits)");
    if (!personal || (!personal.phone && !account.phone)) missing.push("Phone Number (10 digits)");
    if (!personal || !personal.tempAddress1) missing.push("Temporary Address");
    if (!personal || !personal.tempCity) missing.push("Temporary Address City");
    if (!personal || !personal.tempCountry) missing.push("Temporary Address Country");
    if (!personal || !personal.permAddress1) missing.push("Permanent Address");
    if (!personal || !personal.permCity) missing.push("Permanent Address City");
    if (!personal || !personal.permCountry) missing.push("Permanent Address Country");

    // Education validations based on program
    const applyingFor = account.applyingFor || "Bachelor's";
    const applicantType = account.applicantType || "First-Year Student";

    if (applyingFor === "Bachelor's") {
      const b = education?.bachelorDetails;
      if (!b || !b.schoolName) missing.push("10+2 School/Institution Name");
      if (!b || !b.board) missing.push("Education Board");
      if (!b || !b.completionYear) missing.push("Completion Year");
      if (applicantType === "Transfer Student") {
        const t = education?.transferDetails;
        if (!t || !t.currentCollege) missing.push("Current/Previous College Name");
        if (!t || !t.creditsCompleted) missing.push("Credits Completed");
      }
    } else if (applyingFor === "Master's") {
      const m = education?.masterDetails;
      if (!m || !m.university) missing.push("Undergraduate University/Institution");
      if (!m || !m.courseMajor) missing.push("Degree Major/Course");
      if (!m || !m.graduationYear) missing.push("Graduation Year");
    } else if (applyingFor === "Medical") {
      const med = education?.medicalDetails;
      if (!med || !med.highestEducation) missing.push("Medical Education Qualification");
      if (!med || !med.institution) missing.push("Medical Institution Name");
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete the following required fields before submitting: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' and more...' : ''}`,
        missingItems: missing
      });
    }

    // Generate or reuse Application Number
    const applicationNumber = account.applicationNumber || generateApplicationNumber();
    const submissionDate = new Date();

    account.applicationNumber = applicationNumber;
    account.applicationStatus = "Submitted for Approval";
    account.submittedAt = submissionDate;
    account.isLocked = true; // Lock application for editing
    account.changesRequestedNotes = "";
    account.changesRequestedSection = "";
    await account.save();

    // Finalize only the sections presented by the review page.
    if (personal) {
      personal.status = 'Completed';
      await personal.save();
    }
    if (education) {
      education.status = 'Completed';
      await education.save();
    }
    if (test) {
      test.status = 'Completed';
      await test.save();
    }
    // Upsert FirstYearReview record
    await FirstYearReview.findOneAndUpdate(
      { userId },
      {
        userId,
        status: "Submitted",
        submittedAt: submissionDate,
        programType: applyingFor
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Application submitted for approval successfully!",
      applicationNumber,
      submittedAt: submissionDate,
      status: "Submitted for Approval"
    });
  } catch (error) {
    console.error("Error submitting for approval:", error);
    res.status(500).json({ success: false, message: "Submission failed. Please try again.", error: error.message });
  }
};

// GET /api/enrollment/application-status
export const getApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [account, personal, education, test] = await Promise.all([
      Account.findById(userId),
      PersonalDetails.findOne({ userId }),
      EducationDetails.findOne({ userId }),
      TestScores.findOne({ userId })
    ]);

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    res.status(200).json({
      success: true,
      data: {
        applicationNumber: account.applicationNumber || '',
        applicationStatus: account.applicationStatus || 'Draft',
        submittedAt: account.submittedAt || null,
        applicantType: account.applicantType || 'First-Year Student',
        applyingFor: account.applyingFor || "Bachelor's",
        isLocked: account.isLocked || false,
        changesRequestedNotes: account.changesRequestedNotes || '',
        changesRequestedSection: account.changesRequestedSection || '',
        summary: {
          firstName: account.firstName || '',
          lastName: account.lastName || '',
          email: account.email || '',
          phone: account.phone || '',
          personal: personal ? personal.toObject() : {},
          education: education ? education.toObject() : {},
          testScores: test ? test.toObject() : {}
        }
      }
    });
  } catch (error) {
    console.error("Error fetching application status:", error);
    res.status(500).json({ success: false, message: "Failed to fetch application status", error: error.message });
  }
};

// POST /api/enrollment/resubmit
export const resubmitApplication = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const [account, personal, education] = await Promise.all([
      Account.findById(userId),
      PersonalDetails.findOne({ userId }),
      EducationDetails.findOne({ userId })
    ]);

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    if (account.applicationStatus !== 'Changes Requested') {
      return res.status(409).json({ success: false, message: 'This application is not waiting for requested changes.' });
    }

    const missing = [];
    if (!personal || (!personal.fatherFirstName && !personal.fatherName)) missing.push("Father's Name");
    if (!personal || !personal.fatherPhone) missing.push("Father's Phone Number");
    if (!personal || !personal.fatherEmail) missing.push("Father's Email");
    if (!personal || (!personal.motherFirstName && !personal.motherName)) missing.push("Mother's Name");
    if (!personal || !personal.motherPhone) missing.push("Mother's Phone Number");
    if (!personal || (!personal.phone && !account.phone)) missing.push("Phone Number");
    if (!personal || !personal.tempAddress1 || !personal.tempCity || !personal.tempCountry) missing.push("Temporary Address");
    const hasPermanentAddress = personal?.sameAsTemporaryAddress
      ? Boolean(personal.tempAddress1 && personal.tempCity && personal.tempCountry)
      : Boolean(personal?.permAddress1 && personal?.permCity && personal?.permCountry);
    if (!hasPermanentAddress) missing.push("Permanent Address");

    const applyingFor = account.applyingFor || "Bachelor's";
    const applicantType = account.applicantType || 'First-Year Student';
    if (applyingFor === "Bachelor's") {
      const details = education?.bachelorDetails;
      if (!details?.schoolName || !details?.board || !details?.completionYear) missing.push('Education Details');
      if (applicantType === 'Transfer Student' && (!education?.transferDetails?.currentCollege || !education?.transferDetails?.creditsCompleted)) missing.push('Transfer Details');
    } else if (applyingFor === "Master's") {
      const details = education?.masterDetails;
      if (!details?.university || !details?.courseMajor || !details?.graduationYear) missing.push('Education Details');
    } else if (applyingFor === 'Medical') {
      const details = education?.medicalDetails;
      if (!details?.highestEducation || !details?.institution) missing.push('Education Details');
    }

    if (missing.length) {
      return res.status(400).json({ success: false, message: `Please complete required fields before resubmitting: ${missing.join(', ')}.` });
    }

    account.applicationStatus = "Submitted for Approval";
    account.submittedAt = new Date();
    account.isLocked = true;
    account.changesRequestedNotes = "";
    account.changesRequestedSection = "";
    await account.save();

    if (personal) {
      personal.status = 'Completed';
      await personal.save();
    }
    if (education) {
      education.status = 'Completed';
      await education.save();
    }

    await FirstYearReview.findOneAndUpdate(
      { userId },
      { status: "Submitted", submittedAt: new Date() },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Application re-submitted for approval successfully!",
      status: "Submitted for Approval",
      applicationNumber: account.applicationNumber || '',
      submittedAt: account.submittedAt
    });
  } catch (error) {
    console.error("Error resubmitting application:", error);
    res.status(500).json({ success: false, message: "Resubmission failed.", error: error.message });
  }
};

// Legacy review submit endpoint
export const submitReviewApplication = submitForApproval;

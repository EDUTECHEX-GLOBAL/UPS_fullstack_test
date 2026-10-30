import PersonalDetails from '../model/personalmodel.js';
import Account from '../../models/accountModel.js';

const PERSONAL_EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
const PERSONAL_NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ .'-]\p{L}[\p{L}\p{M}]*)*$/u;
const ADDRESS_NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ .'-]\p{L}[\p{L}\p{M}]*)*$/u;
const isValidPostalCode = (country, postalCode) => {
  const normalizedCountry = String(country || '').toLowerCase().replace(/[^a-z]/g, '');
  const code = String(postalCode || '').trim();
  if (normalizedCountry === 'india') return /^\d{6}$/.test(code);
  if (['usa', 'unitedstates'].includes(normalizedCountry)) return /^\d{5}(?:-?\d{4})?$/.test(code);
  if (normalizedCountry === 'canada') return /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(code);
  if (['australia', 'newzealand'].includes(normalizedCountry)) return /^\d{4}$/.test(code);
  if (normalizedCountry === 'germany') return /^\d{5}$/.test(code);
  if (['uk', 'unitedkingdom'].includes(normalizedCountry)) return /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i.test(code);
  return code.length >= 3 && code.length <= 12 && /\d/.test(code) && /^[A-Z0-9](?:[A-Z0-9 -]*[A-Z0-9])?$/i.test(code);
};

// Get Personal Details
export const getPersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId; // Handle both id and userId depending on token structure
    
    let details = await PersonalDetails.findOne({ userId });
    
    // Fetch the base account to get pre-fill data
    const account = await Account.findById(userId);
    const accountData = account ? account.toObject() : {};

    if (!details) {
      // If no details exist, return data pre-filled from the user's account
      return res.status(200).json({ 
        success: true, 
        data: { 
          firstName: accountData.firstName || "",
          lastName: accountData.lastName || "",
          email: accountData.email || req.user.email || "",
          phone: accountData.phone || "",
          mobile: accountData.phone || "",
          applicantType: accountData.applicantType || "First-Year Student",
          applyingFor: accountData.applyingFor || "Bachelor's",
          fatherFirstName: "",
          fatherLastName: "",
          fatherPhone: "",
          fatherEmail: "",
          fatherName: "",
          motherFirstName: "",
          motherLastName: "",
          motherPhone: "",
          motherName: "",
          tempAddress1: "",
          tempAddress2: "",
          tempCity: "",
          tempState: "",
          tempCountry: "",
          tempZip: "",
          sameAsTemporaryAddress: false,
          permAddress1: "",
          permAddress2: "",
          permCity: "",
          permState: "",
          permCountry: "",
          permZip: "",
          passportDoc: null,
          passportNumber: accountData.passportNumber || "",
          passportIssueDate: accountData.passportIssueDate || "",
          passportExpiryDate: accountData.passportExpiryDate || "",
          issuingCountry: accountData.issuingCountry || "",
          citizenship: accountData.citizenship || "",
        }, 
        message: "No personal details found, pre-filled from account." 
      });
    }

    // If details exist, ensure critical fields aren't empty if the account has them
    const responseData = details.toObject();
    responseData.email = accountData.email || responseData.email || req.user.email || "";
    responseData.firstName = accountData.firstName || responseData.firstName || "";
    responseData.lastName = accountData.lastName || responseData.lastName || "";
    responseData.phone = accountData.phone || responseData.phone || responseData.mobile || "";
    responseData.applicantType = accountData.applicantType || "First-Year Student";
    responseData.applyingFor = accountData.applyingFor || "Bachelor's";

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error fetching personal details:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Save or Update Personal Details
export const savePersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId; // From authMiddleware
    const formData = req.body;

    const fatherFirstName = String(formData.fatherFirstName || '').trim();
    const fatherLastName = String(formData.fatherLastName || '').trim();
    const motherFirstName = String(formData.motherFirstName || '').trim();
    const motherLastName = String(formData.motherLastName || '').trim();
    const fatherEmail = String(formData.fatherEmail || '').trim().toLowerCase();
    const phoneFields = [
      ['Phone number', formData.phone],
      ["Father's phone number", formData.fatherPhone],
      ["Mother's phone number", formData.motherPhone],
    ];

    for (const [label, value] of phoneFields) {
      if (!/^\d{10}$/.test(String(value || '').trim())) {
        return res.status(400).json({ success: false, message: `${label} must be exactly 10 digits.` });
      }
    }
    if (![fatherFirstName, fatherLastName, motherFirstName, motherLastName].every((name) => PERSONAL_NAME_PATTERN.test(name))) {
      return res.status(400).json({ success: false, message: 'Parent names may contain letters, spaces, apostrophes, periods, or hyphens only.' });
    }
    if (!PERSONAL_EMAIL_PATTERN.test(fatherEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid father's email address." });
    }

    const sameAsTemporaryAddress = formData.sameAsTemporaryAddress === true || formData.sameAsTemporaryAddress === 'true';
    const addressSets = [
      ['Temporary', formData.tempCity, formData.tempState, formData.tempCountry, formData.tempZip],
      ...(!sameAsTemporaryAddress ? [['Permanent', formData.permCity, formData.permState, formData.permCountry, formData.permZip]] : []),
    ];
    for (const [label, city, state, country, postalCode] of addressSets) {
      const cleanCity = String(city || '').trim();
      const cleanState = String(state || '').trim();
      const cleanCountry = String(country || '').trim();
      if (!ADDRESS_NAME_PATTERN.test(cleanCity)) {
        return res.status(400).json({ success: false, message: `${label} city must contain letters and common name punctuation only.` });
      }
      if (cleanState && !ADDRESS_NAME_PATTERN.test(cleanState)) {
        return res.status(400).json({ success: false, message: `${label} state / province must contain letters and common name punctuation only.` });
      }
      if (!ADDRESS_NAME_PATTERN.test(cleanCountry)) {
        return res.status(400).json({ success: false, message: `${label} country must contain letters and common name punctuation only.` });
      }
      if (!isValidPostalCode(cleanCountry, postalCode)) {
        return res.status(400).json({ success: false, message: `${label} postal code is not valid for ${cleanCountry}.` });
      }
    }

    const sanitizedPhone = formData.phone ? String(formData.phone).replace(/\D/g, '').slice(0, 10) : "";
    const sanitizedFatherPhone = formData.fatherPhone ? String(formData.fatherPhone).replace(/\D/g, '').slice(0, 10) : "";
    const sanitizedMotherPhone = formData.motherPhone ? String(formData.motherPhone).replace(/\D/g, '').slice(0, 10) : "";

    const fatherName = [fatherFirstName, fatherLastName].filter(Boolean).join(" ") || formData.fatherName || "";
    const motherName = [motherFirstName, motherLastName].filter(Boolean).join(" ") || formData.motherName || "";

    const payload = {
      ...formData,
      userId,
      phone: sanitizedPhone,
      mobile: sanitizedPhone,
      fatherFirstName,
      fatherLastName,
      fatherPhone: sanitizedFatherPhone,
      fatherEmail,
      fatherName,
      motherFirstName,
      motherLastName,
      motherPhone: sanitizedMotherPhone,
      motherName,
      status: 'Completed'
    };

    // Use findOneAndUpdate with upsert to create or update the record
    const updatedDetails = await PersonalDetails.findOneAndUpdate(
      { userId },
      payload,
      { new: true, upsert: true, runValidators: true }
    );

    // Sync phone back to account if provided
    if (sanitizedPhone) {
      await Account.findByIdAndUpdate(userId, { phone: sanitizedPhone });
    }

    res.status(200).json({ 
      success: true, 
      message: "Personal details saved successfully", 
      data: updatedDetails 
    });
  } catch (error) {
    console.error("Error saving personal details:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

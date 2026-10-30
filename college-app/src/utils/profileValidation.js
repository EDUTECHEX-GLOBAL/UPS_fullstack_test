const PERSON_PLACE_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]{2,50}$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const POSTAL_REGEX = /^[A-Za-z0-9 -]{3,12}$/;
const ADDRESS_REGEX = /^[A-Za-z0-9À-ÖØ-öø-ÿ .,'/#-]{3,100}$/;
const INDIAN_PIN_REGEX = /^[0-9]{6}$/;

const personPlaceMessage = "Use 2-50 letters only. Spaces, hyphen, apostrophe, and dot are allowed.";

export const profileFieldLabels = {
  firstName: "Legal First/Given Name",
  middleName: "Middle Name",
  lastName: "Last/Family Name",
  preferredFirstName: "Preferred First Name",
  birthCountry: "Birth Country/Region/Territory",
  cityOfBirth: "City of Birth",
  country: "Country of Citizenship",
  city: "City",
  state: "State/Province",
  addressLine1: "Address Line 1",
  addressLine2: "Address Line 2",
  zipCode: "ZIP/Postal Code",
  phone: "Phone Number",
  alternatePhone: "Alternate Phone Number",
  birthDate: "Date of Birth",
  dateOfBirth: "Date of Birth",
};

const valueOf = (value) => (value === undefined || value === null ? "" : String(value).trim());

export const calculateAge = (dateString) => {
  if (!dateString) return null;
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

const isIndia = (country) => /^(india|bharat)$/i.test(valueOf(country));

export const validateProfileField = (name, rawValue, data = {}) => {
  const value = valueOf(rawValue);
  const label = profileFieldLabels[name] || name;

  if (!value) return "";

  if (["firstName", "middleName", "lastName", "preferredFirstName", "birthCountry", "cityOfBirth", "country", "city", "state"].includes(name)) {
    return PERSON_PLACE_REGEX.test(value) ? "" : `${label}: ${personPlaceMessage}`;
  }

  if (["addressLine1", "addressLine2"].includes(name)) {
    return ADDRESS_REGEX.test(value)
      ? ""
      : `${label} must be 3-100 characters and can include letters, numbers, spaces, comma, dot, slash, hyphen, apostrophe, and #.`;
  }

  if (name === "zipCode") {
    if (isIndia(data.country) && !INDIAN_PIN_REGEX.test(value)) {
      return "ZIP/Postal Code must be a 6-digit PIN for India.";
    }
    return POSTAL_REGEX.test(value)
      ? ""
      : "ZIP/Postal Code can include only letters, numbers, spaces, and hyphen.";
  }

  if (["phone", "alternatePhone"].includes(name)) {
    return PHONE_REGEX.test(value)
      ? ""
      : `${label} must contain only digits, with an optional plus sign at the beginning, and be 7-15 digits long.`;
  }

  if (name === "birthDate" || name === "dateOfBirth") {
    const age = calculateAge(value);
    return age !== null && age >= 18 && age <= 25
      ? ""
      : "Date of Birth must show an age between 18 and 25 years.";
  }

  return "";
};

export const validateProfileData = (data = {}) => {
  const errors = {};
  Object.keys(profileFieldLabels).forEach((field) => {
    const error = validateProfileField(field, data[field], data);
    if (error) errors[field] = error;
  });
  return errors;
};

export const profileSectionFields = {
  personal: ["firstName", "middleName", "lastName", "preferredFirstName", "birthDate"],
  contact: ["phone", "alternatePhone"],
  address: ["addressLine1", "addressLine2", "city", "state", "zipCode", "country"],
  geography: ["birthCountry", "cityOfBirth"],
};

export const getSectionErrors = (section, errors = {}) => {
  const fields = profileSectionFields[section] || [];
  return fields.reduce((acc, field) => {
    if (errors[field]) acc[field] = errors[field];
    return acc;
  }, {});
};

export const hasErrors = (errors = {}) => Object.values(errors).some(Boolean);

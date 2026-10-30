export const PERSON_PLACE_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]{2,50}$/;
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
export const POSTAL_REGEX = /^[A-Za-z0-9 -]{3,12}$/;
export const ADDRESS_REGEX = /^[A-Za-z0-9À-ÖØ-öø-ÿ .,'/#-]{3,100}$/;
export const INDIAN_PIN_REGEX = /^[0-9]{6}$/;

const fieldLabels = {
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

const personPlaceFields = new Set([
  "firstName",
  "middleName",
  "lastName",
  "preferredFirstName",
  "birthCountry",
  "cityOfBirth",
  "country",
  "city",
  "state",
]);

const valueOf = (value) => (value === undefined || value === null ? "" : String(value).trim());
const isIndia = (country) => /^(india|bharat)$/i.test(valueOf(country));

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

export const validateProfileField = (name, rawValue, data = {}) => {
  const value = valueOf(rawValue);
  const label = fieldLabels[name] || name;
  if (!value) return "";

  if (personPlaceFields.has(name)) {
    return PERSON_PLACE_REGEX.test(value)
      ? ""
      : `${label} can contain only letters, spaces, hyphen, apostrophe, and dot.`;
  }

  if (name === "addressLine1" || name === "addressLine2") {
    return ADDRESS_REGEX.test(value)
      ? ""
      : `${label} can include only letters, numbers, spaces, comma, dot, slash, hyphen, apostrophe, and #.`;
  }

  if (name === "zipCode") {
    if (isIndia(data.country) && !INDIAN_PIN_REGEX.test(value)) {
      return "ZIP/Postal Code must be a 6-digit PIN for India.";
    }
    return POSTAL_REGEX.test(value)
      ? ""
      : "ZIP/Postal Code can include only letters, numbers, spaces, and hyphen.";
  }

  if (name === "phone" || name === "alternatePhone") {
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

export const validateProfilePayload = (data = {}) => {
  const errors = {};
  Object.keys(fieldLabels).forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const error = validateProfileField(field, data[field], data);
      if (error) errors[field] = error;
    }
  });
  return errors;
};

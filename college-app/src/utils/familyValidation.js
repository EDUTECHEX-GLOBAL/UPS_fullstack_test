export const familyPatterns = {
  name: /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]{2,50}$/,
  middleInitial: /^[A-Za-zÀ-ÖØ-öø-ÿ]$/,
  occupation: /^[A-Za-zÀ-ÖØ-öø-ÿ .'/&-]{2,80}$/,
  employer: /^[A-Za-z0-9À-ÖØ-öø-ÿ .,'&-]{2,100}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[0-9]{7,15}$/,
  place: /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]{2,50}$/,
  address: /^[A-Za-z0-9À-ÖØ-öø-ÿ .,'/#-]{3,100}$/,
  postalCode: /^[A-Za-z0-9 -]{3,12}$/,
  amount: /^[0-9]+$/,
};

export const PARENT_RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'];
export const SIBLING_RELATIONSHIPS = [
  'brother',
  'sister',
  'step_brother',
  'step_sister',
  'half_brother',
  'half_sister',
  'other',
];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const normalized = (value) => String(value ?? '').trim();

const isIndia = (country) => ['india', 'bharat'].includes(normalized(country).toLowerCase());

const setError = (errors, field, message) => {
  errors[field] = message;
};

export const validateFamilyField = (field, value, context = {}) => {
  const required = context.required === true;
  const label = context.label || field;
  const text = normalized(value);

  if (isBlank(value)) {
    return required ? `${label} is required.` : '';
  }

  if (['firstName', 'middleName', 'lastName', 'formerLastName'].includes(field)) {
    return familyPatterns.name.test(text)
      ? ''
      : `${label} can contain only letters, spaces, hyphen, apostrophe, and dot.`;
  }

  if (field === 'middleInitial') {
    return familyPatterns.middleInitial.test(text)
      ? ''
      : `${label} must be a single letter.`;
  }

  if (field === 'parentType') {
    const valid = context.allowNoOtherParent
      ? [...PARENT_RELATIONSHIPS, 'limited_info', 'no_other_parent']
      : [...PARENT_RELATIONSHIPS, 'limited_info'];
    return valid.includes(text) ? '' : 'Select a valid relationship.';
  }

  if (field === 'relationship') {
    const valid = context.relationships || SIBLING_RELATIONSHIPS;
    return valid.includes(text) ? '' : 'Select a valid relationship.';
  }

  if (field === 'occupation') {
    return familyPatterns.occupation.test(text)
      ? ''
      : 'Occupation can contain only letters, spaces, hyphen, apostrophe, dot, slash, and ampersand.';
  }

  if (field === 'employer') {
    return familyPatterns.employer.test(text)
      ? ''
      : 'Employer/company can contain only letters, numbers, spaces, dot, comma, hyphen, apostrophe, and ampersand.';
  }

  if (field === 'email') {
    return familyPatterns.email.test(text) ? '' : 'Enter a valid email address.';
  }

  if (field === 'phoneNumber') {
    return familyPatterns.phone.test(text)
      ? ''
      : 'Phone must be 7 to 15 digits with optional + at the beginning.';
  }

  if (['country', 'city', 'state'].includes(field)) {
    return familyPatterns.place.test(text)
      ? ''
      : `${label} can contain only letters, spaces, hyphen, apostrophe, and dot.`;
  }

  if (['addressLine1', 'addressLine2'].includes(field)) {
    return familyPatterns.address.test(text)
      ? ''
      : `${label} can contain only letters, numbers, spaces, comma, dot, slash, hyphen, apostrophe, and #.`;
  }

  if (field === 'zipCode') {
    if (isIndia(context.country) && !/^[0-9]{6}$/.test(text)) {
      return 'Indian PIN code must be exactly 6 digits.';
    }
    return familyPatterns.postalCode.test(text)
      ? ''
      : 'ZIP/Postal Code can contain only letters, numbers, spaces, and hyphen.';
  }

  if (['annualIncome', 'income', 'childrenCount', 'siblingsCount', 'age'].includes(field)) {
    return familyPatterns.amount.test(text) ? '' : `${label} must contain only numbers.`;
  }

  return '';
};

export const parentDefaults = {
  parentType: '',
  isLiving: '',
  prefix: '',
  firstName: '',
  middleName: '',
  middleInitial: '',
  lastName: '',
  formerLastName: '',
  suffix: '',
  occupation: '',
  educationLevel: '',
  employer: '',
  email: '',
  phoneNumber: '',
  country: '',
  city: '',
  state: '',
  zipCode: '',
  addressLine1: '',
  addressLine2: '',
  annualIncome: '',
};

export const normalizeParentData = (data = {}) => {
  const address = data.address || {};
  return {
    ...parentDefaults,
    ...data,
    middleName: data.middleName || data.middleInitial || '',
    country: data.country || address.country || '',
    city: data.city || address.city || '',
    state: data.state || address.state || '',
    zipCode: data.zipCode || address.zipCode || '',
    addressLine1: data.addressLine1 || address.addressLine1 || '',
    addressLine2: data.addressLine2 || address.addressLine2 || '',
    annualIncome: data.annualIncome === 0 ? '0' : data.annualIncome || '',
  };
};

export const buildParentPayload = (formData) => ({
  ...formData,
  middleInitial: formData.middleName || formData.middleInitial || '',
  address: {
    addressLine1: formData.addressLine1 || '',
    addressLine2: formData.addressLine2 || '',
    city: formData.city || '',
    state: formData.state || '',
    zipCode: formData.zipCode || '',
    country: formData.country || '',
  },
});

export const getParentErrors = (parent, options = {}) => {
  const requireAll = options.requireAll === true;
  const allowNoOtherParent = options.allowNoOtherParent === true;
  const errors = {};
  const data = normalizeParentData(parent);

  const parentTypeError = validateFamilyField('parentType', data.parentType, {
    required: requireAll,
    allowNoOtherParent,
  });
  if (parentTypeError) setError(errors, 'parentType', parentTypeError);

  if (data.parentType === 'no_other_parent' || data.parentType === 'limited_info') {
    return errors;
  }

  [
    ['firstName', 'Parent/Guardian first name'],
    ['middleName', 'Parent/Guardian middle name'],
    ['lastName', 'Parent/Guardian last name'],
    ['occupation', 'Occupation'],
    ['employer', 'Employer/Company name'],
    ['email', 'Email'],
    ['phoneNumber', 'Phone number'],
    ['country', 'Country'],
    ['city', 'City'],
    ['state', 'State/Province'],
    ['zipCode', 'ZIP/Postal Code'],
    ['addressLine1', 'Address Line 1'],
    ['addressLine2', 'Address Line 2'],
    ['annualIncome', 'Annual income'],
  ].forEach(([field, label]) => {
    const error = validateFamilyField(field, data[field], {
      required: requireAll,
      label,
      country: data.country,
    });
    if (error) setError(errors, field, error);
  });

  if (!requireAll) {
    Object.keys(errors).forEach((field) => {
      if (isBlank(data[field])) delete errors[field];
    });
  }

  return errors;
};

export const getSiblingErrors = (siblingData, options = {}) => {
  const requireAll = options.requireAll === true;
  const errors = {};
  const siblingsCount = siblingData.siblingsCount;

  const countError = validateFamilyField('siblingsCount', siblingsCount, {
    required: requireAll,
    label: 'Number of siblings',
  });
  if (countError) setError(errors, 'siblingsCount', countError);

  const count = parseInt(siblingsCount, 10) || 0;
  if (count > 0) {
    (siblingData.siblingsList || []).forEach((sibling, index) => {
      const rowErrors = {};
      [
        ['firstName', 'First/Given name'],
        ['lastName', 'Last/Family/Surname'],
        ['relationship', 'Relationship'],
      ].forEach(([field, label]) => {
        const error = validateFamilyField(field, sibling[field], {
          required: requireAll,
          label,
          relationships: SIBLING_RELATIONSHIPS,
        });
        if (error) rowErrors[field] = error;
      });

      const ageError = validateFamilyField('age', sibling.age, {
        required: false,
        label: 'Age',
      });
      if (ageError) rowErrors.age = ageError;

      if (Object.keys(rowErrors).length) {
        errors[`siblingsList.${index}`] = rowErrors;
      }
    });
  }

  if (!requireAll && !String(siblingsCount ?? '').trim()) {
    delete errors.siblingsCount;
  }

  return errors;
};

export const hasFamilyErrors = (errors) =>
  Object.values(errors || {}).some((value) =>
    value && typeof value === 'object' ? hasFamilyErrors(value) : Boolean(value)
  );

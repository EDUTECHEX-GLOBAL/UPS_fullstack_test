const CountryRulesEngine = {
  // Common configurations that might apply globally or serve as fallbacks
  Common: {
    Personal: {
      requiredFields: ['firstName', 'lastName', 'email', 'dateOfBirth', 'citizenship'],
      fields: []
    }
  },
  
  Australia: {
    Personal: {
      fields: [
        { id: 'cricos', name: 'cricos', label: 'CRICOS Provider Number', type: 'text', placeholder: 'Enter CRICOS Number', required: true, validation: '^\\d{7}[A-Z]$' },
        { id: 'oshc', name: 'oshc', label: 'OSHC Required', type: 'radio', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true }
      ]
    },
    Education: {
      fields: [
        { id: 'genuineStudentQuestions', name: 'genuineStudentQuestions', label: 'Genuine Student Statement', type: 'textarea', placeholder: 'Explain your intent to study...', required: true }
      ]
    },
    TestScores: {
      fields: [
        { id: 'australianEnglishTest', name: 'australianEnglishTest', label: 'Australian English Test Requirements Met?', type: 'radio', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true }
      ]
    }
  },

  'United Kingdom': {
    Personal: {
      fields: [
        { id: 'ucasInformation', name: 'ucasInformation', label: 'UCAS Personal ID', type: 'text', placeholder: 'Enter UCAS ID', required: false }
      ]
    },
    Education: {
      fields: [
        { id: 'ucasTariff', name: 'ucasTariff', label: 'UCAS Tariff Points', type: 'number', placeholder: 'e.g. 112', required: false },
        { id: 'courseChoices', name: 'courseChoices', label: 'Course Choices', type: 'textarea', placeholder: 'List your course choices...', required: true },
        { id: 'academicReference', name: 'academicReference', label: 'Academic Reference Email', type: 'email', placeholder: 'referee@school.edu', required: true }
      ]
    },
    Documents: {
      fields: [
        { id: 'personalStatement', name: 'personalStatement', label: 'Personal Statement', type: 'file', required: true }
      ]
    }
  },

  Canada: {
    Personal: {
      fields: [
        { id: 'studyPermitInformation', name: 'studyPermitInformation', label: 'Study Permit Needed?', type: 'radio', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true },
        { id: 'biometrics', name: 'biometrics', label: 'Biometrics Completed?', type: 'radio', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true }
      ]
    },
    Education: {
      fields: [
        { id: 'wes', name: 'wes', label: 'WES Reference Number', type: 'text', placeholder: 'Enter WES Reference', required: false },
        { id: 'grade12Prerequisite', name: 'grade12Prerequisite', label: 'Grade 12 Prerequisite Subjects Met?', type: 'radio', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true },
        { id: 'courseDescription', name: 'courseDescription', label: 'Detailed Course Description', type: 'textarea', placeholder: 'Briefly describe your previous courses...', required: false }
      ]
    },
    TestScores: {
      fields: [
        { id: 'tefTcf', name: 'tefTcf', label: 'TEF / TCF Scores (French Programs)', type: 'text', placeholder: 'Enter Scores', required: false }
      ]
    }
  },

  France: {
    Personal: {
      fields: [
        { id: 'campusFrance', name: 'campusFrance', label: 'Campus France ID', type: 'text', placeholder: 'Enter Campus France ID', required: true },
        { id: 'parcoursup', name: 'parcoursup', label: 'Parcoursup ID', type: 'text', placeholder: 'Enter Parcoursup ID', required: false },
        { id: 'dap', name: 'dap', label: 'DAP (Demande d\'Admission Préalable)', type: 'radio', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true }
      ]
    },
    Education: {
      fields: [
        { id: 'routeSelection', name: 'routeSelection', label: 'Route Selection', type: 'select', options: [{ label: 'Etudes en France', value: 'etudes' }, { label: 'Direct Application', value: 'direct' }], required: true }
      ]
    },
    Documents: {
      fields: [
        { id: 'motivationLetter', name: 'motivationLetter', label: 'Motivation Letter', type: 'file', required: true },
        { id: 'delfDalf', name: 'delfDalf', label: 'DELF/DALF Certificate', type: 'file', required: false }
      ]
    }
  },
  
  // Specific legacy country logic mapped here
  'United States': {
    Personal: {
      fields: [
        { id: 'usCitizenshipStatus', name: 'usCitizenshipStatus', label: 'U.S. Citizenship Status', type: 'radio', 
          options: [
            { label: 'U.S. citizen or U.S. national', value: 'us_citizen_or_national' },
            { label: 'U.S. dual citizen', value: 'us_dual_citizen' },
            { label: 'U.S. permanent resident (green card holder)', value: 'us_permanent_resident' },
            { label: 'Citizen of non-U.S. country', value: 'non_us_citizen' },
            { label: 'U.S. resident', value: 'us_resident' }
          ], required: true 
        },
        { id: 'yearsLivedInUnitedStates', name: 'yearsLivedInUnitedStates', label: 'Years Lived in U.S.', type: 'number', placeholder: 'Years', required: false }
      ]
    }
  }
};

class RulesEngine {
  static getFieldsForSection(country, section) {
    if (!country) return [];
    const countryRules = CountryRulesEngine[country];
    if (!countryRules) return [];
    
    const sectionRules = countryRules[section];
    return sectionRules && sectionRules.fields ? sectionRules.fields : [];
  }

  static getRequiredFieldsForSection(country, section) {
    const fields = this.getFieldsForSection(country, section);
    return fields.filter(f => f.required).map(f => f.name);
  }
  
  static getAllDynamicFields(country) {
     if (!country || !CountryRulesEngine[country]) return [];
     const c = CountryRulesEngine[country];
     let all = [];
     Object.keys(c).forEach(section => {
         if(c[section].fields) {
             all = [...all, ...c[section].fields];
         }
     });
     return all;
  }
}

export default RulesEngine;

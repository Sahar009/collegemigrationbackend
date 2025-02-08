export const registerValidator = {
  firstname: {
    notEmpty: {
        errorMessage: 'First name is required'
    },
    isString: {
        errorMessage: 'First name must be a string'
    },
    trim: true,
    isLength: {
        options: { min: 2, max: 50 },
        errorMessage: 'First name must be between 2 and 50 characters'
    },
    matches: {
        options: /^[a-zA-Z\s-']+$/,
        errorMessage: 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }
},
lastname: {
  notEmpty: {
      errorMessage: 'Last name is required'
  },
  isString: {
      errorMessage: 'Last name must be a string'
  },
  trim: true,
  isLength: {
      options: { min: 2, max: 50 },
      errorMessage: 'Last name must be between 2 and 50 characters'
  },
  matches: {
      options: /^[a-zA-Z\s-']+$/,
      errorMessage: 'Last name can only contain letters, spaces, hyphens, and apostrophes'
  }
},
  email: {
    trim: true,
    normalizeEmail: true,
    notEmpty: {
      errorMessage: 'Email is required'
    },
    isEmail: {
      errorMessage: 'Must be a valid email address'
    },
    isLength: {
      options: { max: 255 },
      errorMessage: 'Email must not exceed 255 characters'
    }
  },
  password: {
    notEmpty: {
      errorMessage: 'Password is required'
    },
    isLength: {
      options: { min: 8, max: 100 },
      errorMessage: 'Password must be between 8 and 100 characters'
    },
    matches: {
      options: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      errorMessage: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  }
};

// Separate validator for onboarding/profile update
export const onboardingValidator = {
    othernames: {
        optional: true,
        isString: {
            errorMessage: 'Other names must be a string'
        },
        trim: true,
        isLength: {
            options: { min: 2, max: 100 },
            errorMessage: 'Other names must be between 2 and 100 characters'
        }
    },
    phone: {
        optional: true,
        trim: true,
        matches: {
            options: /^\+?[1-9]\d{1,14}$/,
            errorMessage: 'Please provide a valid international phone number (e.g., +1234567890)'
        }
    },
    gender: {
        optional: true,
        isIn: {
            options: [['male', 'female', 'other', 'prefer not to say']],
            errorMessage: 'Gender must be either male, female, other, or prefer not to say'
        }
    },
    dob: {
        optional: true,
        trim: true,
        matches: {
            options: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
            errorMessage: 'Date of birth must be in YYYY-MM-DD format'
        }
    },
    homeAddress: {
        optional: true,
        trim: true
    },
    homeCity: {
        optional: true,
        trim: true
    },
    homeZipCode: {
        optional: true,
        trim: true
    },
    homeState: {
        optional: true,
        trim: true
    },
    homeCountry: {
        optional: true,
        trim: true
    },
    idType: {
        optional: true,
        trim: true,
        isIn: {
            options: [['passport', 'national_id', 'drivers_license']],
            errorMessage: 'ID type must be passport, national_id, or drivers_license'
        }
    },
    idNumber: {
        optional: true,
        trim: true
    },
    idScanFront: {
        optional: true,
        isURL: {
            errorMessage: 'ID scan front must be a valid URL'
        }
    },
    idScanBack: {
        optional: true,
        isURL: {
            errorMessage: 'ID scan back must be a valid URL'
        }
    },
    nationality: {
        optional: true,
        trim: true
    },
    schengenVisaHolder: {
        optional: true,
        isIn: {
            options: [['yes', 'no', 'pending']],
            errorMessage: 'Schengen visa holder must be yes, no, or pending'
        }
    },
    photo: {
        optional: true,
        isURL: {
            errorMessage: 'Photo must be a valid URL'
        }
    }
};

// Login validator
export const loginValidator = {
    email: {
        trim: true,
        normalizeEmail: true,
        notEmpty: {
            errorMessage: 'Email is required'
        },
        isEmail: {
            errorMessage: 'Must be a valid email address'
        }
    },
    password: {
        notEmpty: {
            errorMessage: 'Password is required'
        }
    }
};
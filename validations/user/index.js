export const registerValidator = {
  firstname: {
    notEmpty: {
        errorMessage: 'First name is required'
    },
    isString: {
        errorMessage: 'First name must be a string'
    },
    trim: true
},
lastname: {
  notEmpty: {
      errorMessage: 'Last name is required'
  },
  isString: {
      errorMessage: 'Last name must be a string'
  },
  trim: true
},
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
  phone: {
    optional: true,
    trim: true,
    matches: {
      options: /^\+?[1-9]\d{1,14}$/,
      errorMessage: 'Please provide a valid phone number'
    }
  },
  gender: {
    optional: true,
    isIn: {
      options: [['male', 'female', 'other']],
      errorMessage: 'Gender must be either male, female, or other'
    }
  },
  photo: {
    optional: true,
    isURL: {
      errorMessage: 'Photo must be a valid URL'
    }
  },
  businessName: {
    optional: true,
    trim: true,
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: 'Business name must be between 2 and 100 characters'
    }
  },
  password: {
    notEmpty: {
      errorMessage: 'Password is required'
    },
    isLength: {
      options: { min: 8 },
      errorMessage: 'Password must be at least 8 characters long'
    },
    matches: {
      options: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
      errorMessage: 'Password must contain at least one letter, one number, and one special character'
    }
  }
};
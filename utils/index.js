import cloudinaryModule from 'cloudinary'
import nodemailer from 'nodemailer'
import hbs from 'nodemailer-express-handlebars'
import multer from 'multer'
import path from 'path'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url';
import { Readable } from 'stream'; 
import { Op } from 'sequelize';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// message handler
export const messageHandler = (message, success = true, statusCode = 200, data = null) => {
  return { message, success, statusCode, data }
}

// hash password
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}


// verify password
export const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword) 
}


// generate token
const SECRET_KEY = process.env.JWT_SECRET

export const generateToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}
export const generateAdminToken = (adminData, expiresIn = '1d') => {
  const payload = {
    id: adminData.id,
    username: adminData.username,
    email: adminData.email,
    role: 'admin',  
  };

  return jwt.sign(payload, SECRET_KEY, { expiresIn });
};



// verify token
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    return { success: true, decoded }
  } catch (error) {
    return { success: false, error: 'Invalid or expired token' }
  }
}

// phone number validator
const COUNTRY_CODE = "234"

export const passwordValidator = value => {
  const criteria =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/
  const isValid = criteria.test(value)
  return isValid
}


export const verifyPhoneNumber = (phone) => {
  return /^(?:\+?234|0)?([789][01])\d{8}$/.test(phone);
};

export const sanitizePhoneNumber = (phone) => {
  if (!verifyPhoneNumber(phone)) {
    return { 
      status: false, 
      message: "Phone number is invalid", 
      phone: "" 
    };
  }

  // Remove leading 0 or +
  if (phone.startsWith("0")) {
    phone = phone.substring(1);
  }
  if (phone.startsWith("+")) {
    phone = phone.substring(1);
  }

  // Remove country code if it exists
  if (phone.startsWith(COUNTRY_CODE)) {
    phone = phone.substring(COUNTRY_CODE.length);
  }

  // Add country code with + prefix
  return {
    status: true,
    message: "Phone number is valid",
    phone: `+${COUNTRY_CODE}${phone}`
  };
};

export const normalizePhoneToLocalFormat = (phone) => {
  if (phone.startsWith('+234')) {
    return phone.replace(/^\+234/, '0');
  } else if (phone.startsWith('234')) {
    return phone.replace(/^234/, '0');
  }
  return phone; 
};



// Generate a verification code
export const generateVerificationCode = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

export const validateDocumentUrls = (fieldName, urls) => {
  const isValid = Array.isArray(urls)
    ? urls.every((url) => /\.(pdf|doc|docx)$/i.test(url))
    : /\.(pdf|doc|docx)$/i.test(urls);

  if (!isValid) {
    return (`${fieldName} must contain only PDF, DOC, or DOCX files.`);
  }
};



// query constructor


export const queryConstructor = (query, sortField = 'createdAt', defaultLimit = 10, options = {}) => {
  try {
    const queryParams = {
      where: {},
      order: [],
      limit: defaultLimit,
      offset: 0
    };

    // Pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || defaultLimit;
    const offset = (page - 1) * limit;
    queryParams.limit = limit;
    queryParams.offset = offset;

    // Sorting
    const sortOrder = query.sort?.toLowerCase() || 'desc';
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new Error('Invalid sort order. Use "asc" or "desc"');
    }
    queryParams.order = [[sortField, sortOrder.toUpperCase()]];

    // Price Range Filter
    if (query.minPrice || query.maxPrice) {
      queryParams.where.price = {};
      if (query.minPrice) {
        queryParams.where.price[Op.gte] = parseFloat(query.minPrice);
      }
      if (query.maxPrice) {
        queryParams.where.price[Op.lte] = parseFloat(query.maxPrice);
      }
    }

    // Search Filter
    if (query.search && options.searchFields) {
      queryParams.where[Op.or] = options.searchFields.map(field => ({
        [field]: { [Op.like]: `%${query.search}%` }
      }));
    }

    // Date Range Filter
    if (query.startDate || query.endDate) {
      queryParams.where.createdAt = {};
      if (query.startDate) {
        queryParams.where.createdAt[Op.gte] = new Date(query.startDate);
      }
      if (query.endDate) {
        queryParams.where.createdAt[Op.lte] = new Date(query.endDate);
      }
    }

    // Status Filter
    if (query.status) {
      queryParams.where.status = query.status;
    }

    // Category Filter
    if (query.category) {
      queryParams.where.category = query.category;
    }

    // Add any additional custom filters from options
    if (options.additionalFilters) {
      queryParams.where = {
        ...queryParams.where,
        ...options.additionalFilters
      };
    }

    // Include associations if specified
    if (options.include) {
      queryParams.include = options.include;
    }

    return {
      success: true,
      queryParams,
      pagination: {
        page,
        limit,
        offset
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
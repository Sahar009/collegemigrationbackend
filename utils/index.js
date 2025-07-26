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
import crypto from 'crypto';


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

// migrate PHP password hash to Node.js format
export const migratePasswordHash = async (password, oldHash) => {
  try {
    // If it's already a Node.js bcrypt hash, return it as is
    if (oldHash.startsWith('$2a$') || oldHash.startsWith('$2b$')) {
      return oldHash;
    }
    
    // If it's a PHP bcrypt hash, convert it
    if (oldHash.startsWith('$2y$')) {
      const nodeBcryptHash = oldHash.replace(/^\$2y\$/, '$2a$');
      return nodeBcryptHash;
    }
    
    // If it's neither, hash it with Node.js bcrypt
    return await hashPassword(password);
  } catch (error) {
    console.error('Password migration error:', error);
    return await hashPassword(password);
  }
}


// verify password - handles both PHP password_hash() and Node.js bcrypt
export const verifyPassword = async (password, hashedPassword, userRecord = null) => {
  try {
    // 1. Try bcrypt (Node.js or PHP $2y$)
    if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2y$')) {
      // Convert $2y$ to $2a$ for PHP bcrypt
      const bcryptHash = hashedPassword.startsWith('$2y$')
        ? hashedPassword.replace(/^ 2y\$/, '$2a$')
        : hashedPassword;
      const isValid = await bcrypt.compare(password, bcryptHash);
      return isValid;
    }

    // 2. Try legacy PHP hash (e.g., SHA-256 hex string)
    if (/^[a-f0-9]{64}$/i.test(hashedPassword)) { // SHA-256 hex
      const sha256 = crypto.createHash('sha256').update(password).digest('hex');
      if (sha256 === hashedPassword) {
        // Optionally: re-hash with bcrypt and update user record
        if (userRecord && typeof userRecord.update === 'function') {
          const newBcrypt = await hashPassword(password);
          await userRecord.update({ password: newBcrypt });
        }
        return true;
      }
    }

    // 3. Add more legacy hash checks if needed (e.g., MD5, SHA-1)

    return false;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};


// generate token
const SECRET_KEY = process.env.JWT_SECRET

export const generateToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}
export const generateAdminToken = (adminData, expiresIn = '1d') => {
  const payload = {
    id: adminData.adminId,
    username: adminData.username,
    email: adminData.email,
    role: adminData.role,  
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
import {
  getAllSchoolsService,
  getSchoolByIdService,
  createSchoolService,
  updateSchoolService,
  toggleSchoolStatusService,
  importSchoolsFromCSVService
} from '../service/adminSchoolService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/csv';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `school-import-${Date.now()}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({ 
  storage,
  fileFilter: function (req, file, cb) {
    // Accept only CSV files
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// Get all schools
export const getAllSchools = async (req, res) => {
  try {
    const result = await getAllSchoolsService(req.query);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Get all schools error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve schools',
      statusCode: 500
    });
  }
};

// Get school by ID
export const getSchoolById = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const result = await getSchoolByIdService(schoolId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Get school by ID error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve school',
      statusCode: 500
    });
  }
};

// Create new school
export const createSchool = async (req, res) => {
  try {
    const result = await createSchoolService(req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Create school error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create school',
      statusCode: 500
    });
  }
};

// Update school
export const updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const result = await updateSchoolService(schoolId, req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Update school error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update school',
      statusCode: 500
    });
  }
};

// Toggle school status
export const toggleSchoolStatus = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const result = await toggleSchoolStatusService(schoolId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Toggle school status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update school status',
      statusCode: 500
    });
  }
};

// Import schools from CSV
export const importSchoolsFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded',
        statusCode: 400
      });
    }
    
    const result = await importSchoolsFromCSVService(req.file.path);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Import schools error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import schools',
      statusCode: 500
    });
  }
}; 
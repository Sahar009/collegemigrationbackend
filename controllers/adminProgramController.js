import {
  getAllProgramsService,
  getProgramByIdService,
  createProgramService,
  updateProgramService,
  toggleProgramStatusService,
  importProgramsFromCSVService,
  exportProgramsService
} from '../service/adminProgramService.js';
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
    cb(null, `program-import-${Date.now()}${path.extname(file.originalname)}`);
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

// Get all programs
export const getAllPrograms = async (req, res) => {
  try {
    const result = await getAllProgramsService(req.query);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Get all programs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve programs',
      statusCode: 500
    });
  }
};

// Get program by ID
export const getProgramById = async (req, res) => {
  try {
    const { programId } = req.params;
    const result = await getProgramByIdService(programId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Get program by ID error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve program',
      statusCode: 500
    });
  }
};

// Create new program
export const createProgram = async (req, res) => {
  try {
    const result = await createProgramService(req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Create program error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create program',
      statusCode: 500
    });
  }
};

// Update program
export const updateProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const result = await updateProgramService(programId, req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Update program error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update program',
      statusCode: 500
    });
  }
};

// Toggle program status
export const toggleProgramStatus = async (req, res) => {
  try {
    const { programId } = req.params;
    const result = await toggleProgramStatusService(programId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Toggle program status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update program status',
      statusCode: 500
    });
  }
};

// Import programs from CSV
export const importProgramsFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded',
        statusCode: 400
      });
    }
    
    const result = await importProgramsFromCSVService(req.file.path);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Import programs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import programs',
      statusCode: 500
    });
  }
};

// Export programs
export const exportPrograms = async (req, res) => {
  try {
    const result = await exportProgramsService(req.query);
    
    if (!result.success) {
      return res.status(result.statusCode).json(result);
    }

    // Set secure headers
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=${result.filename}`,
      // 'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Expose-Headers': 'Content-Disposition',
      'Vary': 'Origin'
    });

    return res.send(result.csvData);

  } catch (error) {
    console.error('Export controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
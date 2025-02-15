import { 
    createProgramService, 
    getAllProgramsService, 
    getProgramByIdService, 
    updateProgramService, 
    deleteProgramService,
    searchProgramsService,
    filterProgramsService
} from '../service/programService.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'programs',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ storage: storage });

// Create Program Controller
export const createProgramController = async (req, res) => {
    await createProgramService(req.body, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

// Get All Programs Controller
export const getAllProgramsController = async (req, res) => {
    await getAllProgramsService(req.query, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

// Get Single Program Controller
export const getProgramByIdController = async (req, res) => {
    const programId = req.params.id;
    
    await getProgramByIdService(programId, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

// Update Program Controller
export const updateProgramController = async (req, res) => {
    const programId = req.params.id;
    
    await updateProgramService(programId, req.body, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

// Delete Program Controller
export const deleteProgramController = async (req, res) => {
    const programId = req.params.id;
    
    await deleteProgramService(programId, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

// Search Programs Controller
export const searchProgramsController = async (req, res) => {
    const { query } = req.query;
    
    await searchProgramsService(query, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

// Filter Programs Controller
export const filterProgramsController = async (req, res) => {
    const filters = req.query;
    
    await filterProgramsService(filters, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
}; 


export const createProgram = (req, res) => {
    createProgramService(req.body, (response) => {
        return res.status(response.statusCode).json(response);
    });
}
import multer from 'multer';
import { storage } from '../config/cloudinaryConfig.js';

// Define allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// File filter function
const fileFilter = (req, file, cb) => {
    // Check if the file type is allowed
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and PDF files are allowed.'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Define upload fields
export const uploadFields = upload.fields([
    { name: 'internationalPassport', maxCount: 1 },
    { name: 'olevelResult', maxCount: 1 },
    { name: 'olevelPin', maxCount: 1 },
    { name: 'academicReferenceLetter', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
    { name: 'universityDegreeCertificate', maxCount: 1 },
    { name: 'universityTranscript', maxCount: 1 },
    { name: 'sop', maxCount: 1 },
    { name: 'researchDocs', maxCount: 1 },
    { name: 'languageTestCert', maxCount: 1 },
    { name: 'ageent-phoo', maxCount: 1 }
]);

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            status: false,
            message: `Multer error: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            status: false,
            message: err.message || 'Error uploading file'
        });
    }
    next();
}; 
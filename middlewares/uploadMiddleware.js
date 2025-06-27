import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import path from 'path';

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

// Configure multer instances
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});



// Keep existing uploadFields for other services
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
    { name: 'photo', maxCount: 1 },
    { name: 'idScanFront', maxCount: 1 },
    { name: 'idScanBack', maxCount: 1 }
]);

// Add single document upload
export const uploadSingleDocument = upload.single('file');


// Document type validation middleware
export const validateDocumentType = (req, res, next) => {
    const { documentType } = req.params;
    const validDocumentTypes = [
        'internationalPassport',
        'olevelResult',
        'olevelPin',
        'academicReferenceLetter',
        'resume',
        'universityDegreeCertificate',
        'universityTranscript',
        'sop',
        'researchDocs',
        'languageTestCert',
        'photo',
        'idScanFront',
        'idScanBack'
    ];

    if (!validDocumentTypes.includes(documentType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid document type'
        });
    }

    next();
};

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.log(err);
        return res.status(400).json({
            status: false,
            message: `Upload error: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            status: false,
            message: err.message || 'Error uploading file'
        });
    }
    next();
};

// Add to existing upload config
export const messageAttachments = upload.fields([
    { name: 'attachments', maxCount: 5 }
]);

// CSV file upload configuration
const csvUpload = multer({
    dest: 'uploads/csv/', // Temporary storage for CSV files
    fileFilter: (req, file, cb) => {
        const filetypes = /csv/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only .csv files are allowed!'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 5MB
    }
});

export const uploadCSV = csvUpload.single('file');



import multer from 'multer';
import { storage } from '../config/cloudinaryConfig.js';

// Multer configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Invalid file type. Only images are allowed.'), false);
            return;
        }

        // Validate based on field name
        switch (file.fieldname) {
            case 'photo':
            case 'idScanFront':
            case 'idScanBack':
                cb(null, true);
                break;
            default:
                cb(new Error('Invalid field name for file upload'), false);
        }
    }
});

// Upload fields configuration
export const uploadFields = upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'idScanFront', maxCount: 1 },
    { name: 'idScanBack', maxCount: 1 }
]);

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        let errorMessage = 'File upload error';
        
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                errorMessage = 'File is too large. Maximum size is 5MB';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                errorMessage = 'Invalid file field';
                break;
            default:
                errorMessage = err.message;
        }

        return res.status(400).json({
            status: false,
            message: errorMessage
        });
    }
    
    if (err) {
        return res.status(400).json({
            status: false,
            message: err.message
        });
    }
    
    next();
}; 
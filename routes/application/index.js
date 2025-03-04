import express from 'express';
import { submitApplicationDocuments, getApplicationDocumentsByMember, updateApplicationDocument } from '../../controllers/applicationDocumentController.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';
import { handleUploadError, uploadFields, validateDocumentType, uploadSingleDocument } from '../../middlewares/uploadMiddleware.js';
import { checkEligibility, getAllApplications, getApplicationStatus, initiateApplication } from '../../controllers/applicationController.js';

const applicationRouter = express.Router();

// Routes
applicationRouter.put('/documents', 
    authenticateUser, 
    uploadFields,
    handleUploadError,
    submitApplicationDocuments
);

applicationRouter.get('/documents', 
    authenticateUser, 
    getApplicationDocumentsByMember
);

applicationRouter.put('/documents/:documentId', 
    authenticateUser, 
    uploadFields,
    handleUploadError,
    updateApplicationDocument
);
// Initiate new application
applicationRouter.post('/initiate', 
    authenticateUser, 
    initiateApplication
);

// Get application status
applicationRouter.get('/status/:applicationId', 
    authenticateUser, 
    getApplicationStatus
);

// Get all applications
applicationRouter.get('/all', 
    authenticateUser, 
    getAllApplications
);

applicationRouter.post('/check-eligibility', 
    authenticateUser, 
    checkEligibility
);

// Add new single document upload route
applicationRouter.post(
    '/documents/:documentType',
    authenticateUser,
    validateDocumentType,
    uploadSingleDocument,
    handleUploadError,
    uploadSingleDocument
);

export default applicationRouter; 
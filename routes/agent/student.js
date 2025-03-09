import express from 'express';
import { authenticateAgent } from '../../middleware/authMiddleware.js';
import {
    validateCreateStudent,
    validateUpdateStudent,
    validateGetStudents,
    validateMemberId
} from '../../middleware/studentValidation.js';
import {
    createStudent,
    getAllStudents,
    getStudent,
    updateStudent,
    deleteStudent
} from '../../controllers/agentStudentController.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { getStudentDocuments, submitStudentDocuments, updateStudentDocument, uploadSingleStudentDocument } from '../../controllers/agentStudentDocumentController.js';
import { handleUploadError, uploadSingleDocument, validateDocumentType } from '../../middlewares/uploadMiddleware.js';
import { createAgentApplication, getAgentApplication, updateAgentApplication } from '../../controllers/agentApplicationController.js';

const studentRouter = express.Router();

// Apply authentication middleware to all routes
studentRouter.use(authenticateAgent);

// Student routes
studentRouter.post('/', validateCreateStudent, asyncHandler(createStudent));
studentRouter.get('/', validateGetStudents, asyncHandler(getAllStudents));
studentRouter.get('/:memberId', validateMemberId, asyncHandler(getStudent));
studentRouter.put('/:memberId', validateUpdateStudent, asyncHandler(updateStudent));
studentRouter.delete('/:memberId', validateMemberId, asyncHandler(deleteStudent));

// Student Document routes
studentRouter.post('/documents', validateDocumentType, asyncHandler(submitStudentDocuments));
studentRouter.get('/documents/:memberId',  authenticateAgent, asyncHandler(getStudentDocuments));
studentRouter.put(
    '/documents/:memberId/:documentType',
    authenticateAgent,
    validateDocumentType,
    uploadSingleDocument,
    handleUploadError,
    asyncHandler(updateStudentDocument)
);
studentRouter.post('/documents/upload', validateDocumentType,uploadSingleDocument,handleUploadError, asyncHandler(uploadSingleStudentDocument));

// Application routes
studentRouter.post('/application',authenticateAgent, asyncHandler(createAgentApplication));
studentRouter.get('/application/:memberId', authenticateAgent,  asyncHandler(getAgentApplication));
studentRouter.put('/application/:memberId', authenticateAgent,  asyncHandler(updateAgentApplication));


export default studentRouter; 
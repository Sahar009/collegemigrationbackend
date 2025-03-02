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

const studentRouter = express.Router();

// Apply authentication middleware to all routes
studentRouter.use(authenticateAgent);

// Student routes
studentRouter.post('/', validateCreateStudent, asyncHandler(createStudent));
studentRouter.get('/', validateGetStudents, asyncHandler(getAllStudents));
studentRouter.get('/:memberId', validateMemberId, asyncHandler(getStudent));
studentRouter.put('/:memberId', validateUpdateStudent, asyncHandler(updateStudent));
studentRouter.delete('/:memberId', validateMemberId, asyncHandler(deleteStudent));

export default studentRouter; 
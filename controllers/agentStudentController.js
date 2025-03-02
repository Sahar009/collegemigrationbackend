import * as agentStudentService from '../service/agentStudentService.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';

// Create student
export const createStudent = async (req, res) => {
    try {
        const agentId = req.user.agentId; // From auth middleware
        const result = await agentStudentService.createAgentStudent(agentId, req.body);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

// Get all students
export const getAllStudents = async (req, res) => {
    try {
        const agentId = req.user.agentId;
        const { page = 1, limit = 10 } = req.query;
        const result = await agentStudentService.getAllAgentStudents(agentId, parseInt(page), parseInt(limit));
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

// Get single student
export const getStudent = async (req, res) => {
    try {
        const agentId = req.user.agentId;
        const { memberId } = req.params;
        const result = await agentStudentService.getAgentStudent(agentId, parseInt(memberId));
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

// Update student
export const updateStudent = async (req, res) => {
    try {
        const agentId = req.user.agentId;
        const { memberId } = req.params;
        const result = await agentStudentService.updateAgentStudent(agentId, parseInt(memberId), req.body);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

// Delete student
export const deleteStudent = async (req, res) => {
    try {
        const agentId = req.user.agentId;
        const { memberId } = req.params;
        const result = await agentStudentService.deleteAgentStudent(agentId, parseInt(memberId));
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
}; 
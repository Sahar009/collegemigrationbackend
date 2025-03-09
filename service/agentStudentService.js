import { Agent } from '../schema/AgentSchema.js';
import AgentStudent from '../schema/AgentStudentSchema.js';
import { messageHandler } from '../utils/index.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';

// Create Agent Student
export const createAgentStudent = async (agentId, data) => {
    try {
        // Check if agent exists and is active
        const agent = await Agent.findOne({ 
            where: { 
                agentId,
                status: 'active'
            } 
        });

        if (!agent) {
            return messageHandler('Agent not found or inactive', false, 404);
        }

        // Check if email already exists
        const existingStudent = await AgentStudent.findOne({ 
            where: { email: data.email } 
        });
        
        if (existingStudent) {
            return messageHandler('Email already registered', false, 400);
        }

        const newStudent = await AgentStudent.create({
            ...data,
            agentId, // Associate student with agent
            memberStatus: 'Active'
        });

        return messageHandler(
            'Student registered successfully',
            true,
            201,
            newStudent
        );
    } catch (error) {
        console.error('Create agent student error:', error);
        return messageHandler(
            'Failed to register student',
            false,
            500
        );
    }
};

// Get All Agent Students (for specific agent)
export const getAllAgentStudents = async (agentId, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        
        const students = await AgentStudent.findAndCountAll({
            where: { agentId }, // Only get students for this agent
            limit,
            offset,
            order: [['regDate', 'DESC']]
        });

        return messageHandler(
            'Students retrieved successfully',
            true,
            200,
            {
                students: students.rows,
                total: students.count,
                currentPage: page,
                totalPages: Math.ceil(students.count / limit)
            }
        );
    } catch (error) {
        console.error('Get students error:', error);
        return messageHandler(
            'Failed to retrieve students',
            false,
            500
        );
    }
};

// Get Single Agent Student
export const getAgentStudent = async (agentId, memberId) => {
    try {
        const student = await AgentStudent.findOne({
            where: {
                memberId,
                agentId
            },
            attributes: [
                'memberId',
                'agentId',
                'firstname',
                'lastname',
                'othernames',
                'email',
                'phone',
                'gender',
                'dob',
                'homeAddress',
                'homeCity',
                'homeZipCode',
                'homeState',
                'homeCountry',
                'nationality',
                'idType',
                'idNumber',
                'idScanFront',
                'idScanBack',
                'photo',
                'schengenVisaHolder',
                'memberStatus',
                'regDate'
            ],
            include: [
                {
                    model: AgentStudentDocument,
                    as: 'documents',
                    attributes: [
                        'documentId',
                        'documentType',
                        'documentPath',
                        'status',
                        'uploadDate'
                    ]
                },
                {
                    model: Agent,
                    attributes: [
                        'agentId',
                        'companyName',
                        'contactPerson',
                        'email'
                    ]
                }
            ]
        });

        if (!student) {
            return messageHandler('Student not found', false, 404);
        }

        const response = {
            studentInfo: student,
            agentInfo: student.Agent,
            documents: student.documents || []
        };

        return messageHandler(
            'Student retrieved successfully',
            true,
            200,
            response
        );
    } catch (error) {
        console.error('Get student error:', error);
        return messageHandler(
            'Failed to retrieve student',
            false,
            500
        );
    }
};

// Update Agent Student
export const updateAgentStudent = async (agentId, memberId, data) => {
    try {
        const student = await AgentStudent.findOne({
            where: {
                memberId,
                agentId // Ensure student belongs to agent
            }
        });
        
        if (!student) {
            return messageHandler('Student not found', false, 404);
        }

        // If email is being updated, check if new email exists
        if (data.email && data.email !== student.email) {
            const existingEmail = await AgentStudent.findOne({
                where: { email: data.email }
            });
            if (existingEmail) {
                return messageHandler('Email already exists', false, 400);
            }
        }

        await student.update(data);

        return messageHandler(
            'Student updated successfully',
            true,
            200,
            student
        );
    } catch (error) {
        console.error('Update student error:', error);
        return messageHandler(
            'Failed to update student',
            false,
            500
        );
    }
};

// Delete Agent Student
export const deleteAgentStudent = async (agentId, memberId) => {
    try {
        const student = await AgentStudent.findOne({
            where: {
                memberId,
                agentId // Ensure student belongs to agent
            }
        });
        
        if (!student) {
            return messageHandler('Student not found', false, 404);
        }

        // Soft delete by updating status
        await student.update({ memberStatus: 'Inactive' });

        return messageHandler(
            'Student deleted successfully',
            true,
            200
        );
    } catch (error) {
        console.error('Delete student error:', error);
        return messageHandler(
            'Failed to delete student',
            false,
            500
        );
    }
};

// Add association to AgentStudent model if not already added
AgentStudent.hasMany(AgentStudentDocument, {
    foreignKey: 'memberId',
    sourceKey: 'memberId'
}); 
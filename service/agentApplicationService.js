import { messageHandler } from '../utils/index.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import AgentStudent from '../schema/AgentStudentSchema.js';
import { Program } from '../schema/programSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import AgentTransaction from '../schema/AgentTransactionSchema.js';

// Create Application for Agent Student
export const createAgentApplicationService = async (agentId, data, callback) => {
    try {
        // Check if student exists and belongs to agent
        const student = await AgentStudent.findOne({
            where: { 
                memberId: data.memberId,
                agentId
            }
        });

        if (!student) {
            return callback(messageHandler(
                "Student not found or doesn't belong to agent",
                false,
                NOT_FOUND
            ));
        }

        // Check if program exists
        const program = await Program.findByPk(data.programId);
        if (!program) {
            return callback(messageHandler(
                "Program not found",
                false,
                NOT_FOUND
            ));
        }

        // Create application with proper ENUM values
        const application = await AgentApplication.create({
            agentId,
            memberId: data.memberId,
            programId: data.programId,
            applicationStage: 'documents',  // Using ENUM value
            paymentStatus: 'pending',       // Using ENUM value
            applicationStatus: 'pending',    // Using ENUM value
            intake: data.intake,
            applicationDate: new Date()
        });

        return callback(messageHandler(
            "Application created successfully",
            true,
            SUCCESS,
            application
        ));

    } catch (error) {
        console.error('Create application error:', error);
        return callback(messageHandler(
            "Error creating application",
            false,
            BAD_REQUEST
        ));
    }
};

// Get Single Application
export const getAgentApplicationService = async (agentId, applicationId, callback) => {
    try {
        const application = await AgentApplication.findOne({
            where: { 
                applicationId,
                agentId 
            },
            include: [
                {
                    model: AgentStudent,
                    as: 'student',
                    include: [{
                        model: AgentStudentDocument,
                        as: 'documents',
                        attributes: ['documentId', 'documentType', 'documentPath', 'status']
                    }]
                },
                {
                    model: Program,
                    as: 'program'
                }
            ]
        });

        if (!application) {
            return callback(messageHandler(
                "Application not found",
                false,
                NOT_FOUND
            ));
        }

        return callback(messageHandler(
            "Application details retrieved",
            true,
            SUCCESS,
            application
        ));

    } catch (error) {
        console.error('Get application error:', error);
        return callback(messageHandler(
            "Error retrieving application details",
            false,
            BAD_REQUEST
        ));
    }
};

// Get All Applications for Agent
export const getAllAgentApplicationsService = async (agentId, query) => {
    try {
        // Set default values for pagination
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        
        if (page < 1 || limit < 1) {
            return messageHandler(
                "Invalid pagination parameters",
                false,
                400
            );
        }

        const offset = (page - 1) * limit;
        
        const { count, rows: applications } = await AgentApplication.findAndCountAll({
            where: { agentId },
            include: [
                {
                    model: AgentStudent,
                    as: 'student',
                    attributes: [
                        'memberId', 'firstname', 'lastname', 'email',
                        'phone', 'nationality', 'memberStatus'
                    ]
                },
                {
                    model: Program,
                    as: 'program',
                    attributes: [
                        'programId', 'programName', 'degree',
                        'schoolName', 'fee', 'applicationFee'
                    ]
                },
                {
                    model: AgentTransaction,
                    as: 'transactions',
                    attributes: ['transactionId', 'amount', 'currency', 'status', 'paymentReference'],
                    limit: 1,
                    order: [['createdAt', 'DESC']]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        return messageHandler(
            "Applications retrieved successfully",
            true,
            200,
            {
                data: applications,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    pageSize: limit,
                    hasNextPage: page * limit < count,
                    hasPreviousPage: page > 1
                }
            }
        );

    } catch (error) {
        console.error('Get all applications error:', error);
        return messageHandler(
            "Error retrieving applications",
            false,
            500
        );
    }
};

// Update Application Status
export const updateAgentApplicationService = async (agentId, applicationId, data, callback) => {
    try {
        const application = await AgentApplication.findOne({
            where: { 
                applicationId,
                agentId 
            }
        });

        if (!application) {
            return callback(messageHandler(
                "Application not found",
                false,
                NOT_FOUND
            ));
        }

        await application.update({
            applicationStage: data.applicationStage || application.applicationStage,
            applicationStatus: data.applicationStatus || application.applicationStatus,
            paymentStatus: data.paymentStatus || application.paymentStatus,
            intake: data.intake || application.intake,
            applicationStatusDate: new Date()
        });

        return callback(messageHandler(
            "Application updated successfully",
            true,
            SUCCESS,
            application
        ));

    } catch (error) {
        console.error('Update application error:', error);
        return callback(messageHandler(
            "Error updating application",
            false,
            BAD_REQUEST
        ));
    }
};

// Delete Application (Soft Delete)
export const deleteAgentApplicationService = async (agentId, applicationId, callback) => {
    try {
        const application = await AgentApplication.findOne({
            where: { 
                applicationId,
                agentId 
            }
        });

        if (!application) {
            return callback(messageHandler(
                "Application not found",
                false,
                NOT_FOUND
            ));
        }

        await application.update({
            applicationStatus: 'cancelled',
            applicationStatusDate: new Date()
        });

        return callback(messageHandler(
            "Application cancelled successfully",
            true,
            SUCCESS
        ));

    } catch (error) {
        console.error('Delete application error:', error);
        return callback(messageHandler(
            "Error cancelling application",
            false,
            BAD_REQUEST
        ));
    }
}; 
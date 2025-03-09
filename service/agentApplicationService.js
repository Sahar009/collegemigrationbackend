import { messageHandler } from '../utils/index.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import AgentStudent from '../schema/AgentStudentSchema.js';
import { Program } from '../schema/programSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';

// Create Application for Agent Student
export const createAgentApplicationService = async (agentId, data, callback) => {
    try {
        const { memberId, programId } = data;

        // Check if student exists and belongs to agent
        const student = await AgentStudent.findOne({
            where: { 
                memberId,
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
        const program = await Program.findByPk(programId);
        if (!program) {
            return callback(messageHandler(
                "Program not found",
                false,
                NOT_FOUND
            ));
        }

        // Create application
        const application = await AgentApplication.create({
            memberId,
            programId,
            agentId,
            applicationStage: 'documents',
            paymentStatus: 'pending',
            applicationStatus: 'pending',
            intake: data.intake || 'upcoming',
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
export const getAllAgentApplicationsService = async (agentId, callback) => {
    try {
        const applications = await AgentApplication.findAll({
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
                }
            ],
            order: [['applicationDate', 'DESC']]
        });

        return callback(messageHandler(
            "Applications retrieved successfully",
            true,
            SUCCESS,
            applications
        ));

    } catch (error) {
        console.error('Get all applications error:', error);
        return callback(messageHandler(
            "Error retrieving applications",
            false,
            BAD_REQUEST
        ));
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
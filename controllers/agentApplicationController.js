import {
    createAgentApplicationService,
    getAgentApplicationService,
    getAllAgentApplicationsService,
    updateAgentApplicationService,
    deleteAgentApplicationService
} from '../service/agentApplicationService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

// Create Application
export const createAgentApplication = async (req, res) => {
    try {
        const agentId = req.agent.id;
        const { memberId, programId, intake } = req.body;

        // Validate required fields
        if (!memberId || !programId) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Member ID and Program ID are required",
                    false,
                    BAD_REQUEST
                )
            );
        }

        await createAgentApplicationService(
            agentId,
            { memberId, programId, intake },
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Create application controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                error.message || "Error creating application",
                false,
                BAD_REQUEST
            )
        );
    }
};

// Get Single Application
export const getAgentApplication = async (req, res) => {
    try {
        const agentId = req.agent.id;
        const { applicationId } = req.params;

        if (!applicationId) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID is required",
                    false,
                    BAD_REQUEST
                )
            );
        }

        await getAgentApplicationService(
            agentId,
            applicationId,
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Get application controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                "Error retrieving application",
                false,
                BAD_REQUEST
            )
        );
    }
};

// Get All Applications
export const getAllAgentApplications = async (req, res) => {
    try {
        const agentId = req.agent.id;

        await getAllAgentApplicationsService(
            agentId,
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Get all applications controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                "Error retrieving applications",
                false,
                BAD_REQUEST
            )
        );
    }
};

// Update Application
export const updateAgentApplication = async (req, res) => {
    try {
        const agentId = req.agent.id;
        const { applicationId } = req.params;
        const updateData = {
            applicationStage: req.body.applicationStage,
            applicationStatus: req.body.applicationStatus,
            paymentStatus: req.body.paymentStatus,
            intake: req.body.intake
        };

        if (!applicationId) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID is required",
                    false,
                    BAD_REQUEST
                )
            );
        }

        await updateAgentApplicationService(
            agentId,
            applicationId,
            updateData,
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Update application controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                error.message || "Error updating application",
                false,
                BAD_REQUEST
            )
        );
    }
};

// Delete (Cancel) Application
export const deleteAgentApplication = async (req, res) => {
    try {
        const agentId = req.agent.id;
        const { applicationId } = req.params;

        if (!applicationId) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID is required",
                    false,
                    BAD_REQUEST
                )
            );
        }

        await deleteAgentApplicationService(
            agentId,
            applicationId,
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Delete application controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                "Error cancelling application",
                false,
                BAD_REQUEST
            )
        );
    }
};

// Get Applications by Student
export const getStudentApplications = async (req, res) => {
    try {
        const agentId = req.agent.id;
        const { memberId } = req.params;

        if (!memberId) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Member ID is required",
                    false,
                    BAD_REQUEST
                )
            );
        }

        // Use the getAllAgentApplicationsService but filter by memberId
        await getAllAgentApplicationsService(
            agentId,
            (response) => {
                if (response.success) {
                    // Filter applications for specific student
                    const studentApplications = response.data.filter(
                        app => app.memberId === parseInt(memberId)
                    );
                    response.data = studentApplications;
                }
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Get student applications controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                "Error retrieving student applications",
                false,
                BAD_REQUEST
            )
        );
    }
}; 
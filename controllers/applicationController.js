import { 
    initiateApplicationService, 
    getApplicationStatusService, 
    getAllApplicationsService,
    checkEligibilityService
} from '../service/applicationService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

export const initiateApplication = async (req, res) => {
    try {
        const memberId = req.user.id;
        const { programId, programCategory, intake } = req.body;

        // Validate required fields
        if (!programId || !programCategory || !intake) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Program ID, category and intake are required", 
                    false, 
                    BAD_REQUEST
                )
            );
        }

        // Validate program category
        if (!['undergraduate', 'postgraduate', 'phd'].includes(programCategory.toLowerCase())) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Invalid program category. Must be undergraduate, postgraduate, or phd", 
                    false, 
                    BAD_REQUEST
                )
            );
        }

        await initiateApplicationService(
            memberId, 
            { programId, programCategory, intake }, 
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );

    } catch (error) {
        console.error('Initiate application controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                error.message || "Error initiating application", 
                false, 
                BAD_REQUEST
            )
        );
    }
};

export const getApplicationStatus = async (req, res) => {
    try {
        const memberId = req.user.id;
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

        await getApplicationStatusService(memberId, applicationId, (response) => {
            res.status(response.statusCode).json(response);
        });

    } catch (error) {
        console.error('Get application status controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(
                "Error retrieving application status", 
                false, 
                BAD_REQUEST
            )
        );
    }
}; 


export const getAllApplications = (req, res) => {
    const memberId  = req.user.id; 

    getAllApplicationsService(memberId, (response) => {
        return res.status(response.statusCode).json(response);
    });
};

export const checkEligibility = (req, res) => {
    const memberId = req.user.id; 

    checkEligibilityService(memberId, (response) => {
        return res.status(response.statusCode).json(response);
    });
}; 
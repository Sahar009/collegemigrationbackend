import * as agentProfileService from '../service/agentProfileService.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';


export const completeProfile = async (req, res) => {
    try {
        const agentId = req.user.id || req.user.agentId || req.body.agentId;
        const profileData = req.body;
        
        // Handle photo upload if provided
        if (req.files && req.files.photo && req.files.photo[0]) {
            const photoFile = req.files.photo[0];
            console.log('Processing photo file:', photoFile.originalname);
            // Assuming the file path is already set by multer/cloudinary middleware
            profileData.photo = photoFile.path;
        } else {
            console.log('No photo file provided in the request');
        }

        // Call the service with the updated profile data
        await agentProfileService.completeAgentProfile(agentId, profileData, (result) => {
            return res.status(result.success ? 200 : 400).json(result);
        });
        
    } catch (error) {
        console.error('Complete profile controller error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error completing profile'
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        // Make sure we're using agentId from the authenticated user
        const agentId = req.user.agentId;
        
        if (!agentId) {
            return res.status(BAD_REQUEST).json({
                success: false,
                message: 'Agent ID not found'
            });
        }

        const result = await agentProfileService.getAgentProfile(agentId);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const result = await agentProfileService.updateAgentProfile(
            req.user.id,
            req.body,
            req.file
        );
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
}; 

export const validateProfileCompletionController = async (req, res) => {
    try {
        // Debug log to see what we're getting
        console.log('Request user:', req.user);
        console.log('Request agent:', req.agent);
        
        // Try multiple possible locations for the ID
        const agentId = req.user?.id || req.user?.agentId || req.agent?.id;
        
        console.log('Agent ID being used:', agentId);

        if (!agentId) {
            return res.status(BAD_REQUEST).json({
                success: false,
                message: 'Agent ID not found in request',
                isCompleted: false
            });
        }

        const result = await agentProfileService.validateProfileCompletion(agentId);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        console.error('Validation controller error:', error);
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const validateProfile = async (req, res) => {
    try {
        const agentId = req.params.agentId;
        
        // Ensure the agent can only validate their own profile
        if (parseInt(agentId) !== req.user.agentId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to validate this profile'
            });
        }

        const result = await agentProfileService.validateProfileCompletion(agentId);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        console.error('Profile validation error:', error);
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

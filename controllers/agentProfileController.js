import * as agentProfileService from '../service/agentProfileService.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';

export const completeProfile = async (req, res) => {
    try {
        const result = await agentProfileService.completeAgentProfile(
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

export const getProfile = async (req, res) => {
    try {
        const result = await agentProfileService.getAgentProfile(req.user.id);
        return res.status(SUCCESS).json(result);
    } catch (error) {
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
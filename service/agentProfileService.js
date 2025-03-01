import { Agent } from '../schema/AgentSchema.js';
import { AgentPersonalInfo } from '../schema/AgentPersonalInfoSchema.js';
import { MESSAGES } from '../config/constants.js';
import { uploadFields } from '../middlewares/uploadMiddleware.js';

export const completeAgentProfile = async (agentId, profileData, photoFile) => {
    try {
        // Check if agent exists
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        // Upload photo if provided
        let photoUrl = null;
        if (photoFile) {
            photoUrl = await uploadFields(photoFile, 'agent-photos');
        }

        // Create or update personal information
        const [personalInfo, created] = await AgentPersonalInfo.findOrCreate({
            where: { agentId },
            defaults: {
                ...profileData,
                photo: photoUrl
            }
        });

        if (!created) {
            // Update existing record
            await personalInfo.update({
                ...profileData,
                photo: photoUrl || personalInfo.photo // Keep existing photo if no new photo
            });
        }

        // Get updated profile with all information
        const updatedProfile = await Agent.findByPk(agentId, {
            include: [{
                model: AgentPersonalInfo,
                attributes: { exclude: ['agentId'] }
            }]
        });

        return {
            success: true,
            message: 'Profile completed successfully',
            data: updatedProfile
        };
    } catch (error) {
        console.error('Complete profile error:', error);
        throw error;
    }
};

export const getAgentProfile = async (agentId) => {
    try {
        const profile = await Agent.findByPk(agentId, {
            include: [{
                model: AgentPersonalInfo,
                attributes: { exclude: ['agentId'] }
            }]
        });

        if (!profile) {
            throw new Error('Agent profile not found');
        }

        return {
            success: true,
            data: profile
        };
    } catch (error) {
        console.error('Get profile error:', error);
        throw error;
    }
};

export const updateAgentProfile = async (agentId, updateData, photoFile) => {
    try {
        const personalInfo = await AgentPersonalInfo.findByPk(agentId);
        if (!personalInfo) {
            throw new Error('Profile not found');
        }

        // Upload new photo if provided
        if (photoFile) {
            updateData.photo = await uploadFile(photoFile, 'agent-photos');
        }

        // Update personal information
        await personalInfo.update(updateData);

        // Get updated profile
        const updatedProfile = await getAgentProfile(agentId);

        return {
            success: true,
            message: 'Profile updated successfully',
            data: updatedProfile.data
        };
    } catch (error) {
        console.error('Update profile error:', error);
        throw error;
    }
};

export const validateProfileCompletion = async (agentId) => {
    try {
        const personalInfo = await AgentPersonalInfo.findByPk(agentId);
        
        if (!personalInfo) {
            return {
                success: false,
                message: 'Profile not completed',
                isCompleted: false
            };
        }

        // Define required fields
        const requiredFields = [
            'dob',
            'idType',
            'idNumber',
            'nationality',
            'homeAddress',
            'homeCity',
            'homeCountry',
            'gender'
        ];

        // Check if all required fields are filled
        const missingFields = requiredFields.filter(field => !personalInfo[field]);

        return {
            success: true,
            isCompleted: missingFields.length === 0,
            missingFields
        };
    } catch (error) {
        console.error('Validate profile completion error:', error);
        throw error;
    }
}; 
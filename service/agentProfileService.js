import { Agent } from '../schema/AgentSchema.js';
import { AgentPersonalInfo } from '../schema/AgentPersonalInfoSchema.js';
import { MESSAGES } from '../config/constants.js';

export const completeAgentProfile = async (agentId, profileData, callback) => {
    try {
        // Check if agent exists
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            return callback({
                success: false,
                message: 'Agent not found'
            });
        }

        // Create or update personal information
        const [personalInfo, created] = await AgentPersonalInfo.findOrCreate({
            where: { agentId },
            defaults: {
                ...profileData
            }
        });

        if (!created) {
            // Update existing record
            await personalInfo.update(profileData);
        }

        // Validate profile completion after update
        const validationResult = await validateProfileCompletion(agentId);

        // Get updated profile with all information
        const updatedProfile = await Agent.findByPk(agentId, {
            include: [{
                model: AgentPersonalInfo,
                attributes: { exclude: ['agentId'] }
            }]
        });

        return callback({
            success: true,
            message: validationResult.isCompleted 
                ? 'Profile completed successfully' 
                : 'Profile updated but some information is still missing',
            isCompleted: validationResult.isCompleted,
            completionPercentage: validationResult.completionPercentage,
            missingFields: validationResult.missingFields,
            data: updatedProfile
        });
    } catch (error) {
        console.error('Complete profile error:', error);
        return callback({
            success: false,
            message: error.message || 'Error completing profile'
        });
    }
};

export const getAgentProfile = async (agentId) => {
    try {
        const agent = await Agent.findByPk(agentId, {
            include: [{
                model: AgentPersonalInfo,
                attributes: { exclude: ['agentId'] }
            }]
        });

        if (!agent) {
            throw new Error('Agent not found');
        }

        // Even if personal info doesn't exist, return the agent data
        return {
            success: true,
            data: {
                agent: {
                    agentId: agent.agentId,
                    email: agent.email,
                    status: agent.status,
                    companyName: agent.companyName,
                    contactPerson: agent.contactPerson
                },
                personalInfo: agent.AgentPersonalInfo || null
            }
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
        console.log(agentId)
        // Check if agent exists
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            return {
                success: false,
                message: 'Agent not found',
                isCompleted: false
            };
        }

        // Get personal info
        const personalInfo = await AgentPersonalInfo.findOne({
            where: { agentId }
        });
        
        if (!personalInfo) {
            return {
                success: false,
                message: 'Profile not completed',
                isCompleted: false,
                missingFields: ['All profile information is missing'],
                completionPercentage: 0
            };
        }

        // Define required fields and their groups
        const requiredFields = {
            personalInfo: ['dob', 'gender', 'nationality'],
            identification: ['idType', 'idNumber'],
            address: ['homeAddress', 'homeCity', 'homeCountry', 'homeState'],
            contact: ['phone'],
            documents: ['photo']
        };

        // Calculate completion status for each group
        const completionStatus = {};
        const missingFields = [];
        let totalFields = 0;
        let completedFields = 0;

        for (const [group, fields] of Object.entries(requiredFields)) {
            completionStatus[group] = {
                required: fields.length,
                completed: 0,
                missing: []
            };

            totalFields += fields.length;

            fields.forEach(field => {
                if (!personalInfo[field]) {
                    completionStatus[group].missing.push(field);
                    missingFields.push(field);
                } else {
                    completionStatus[group].completed += 1;
                    completedFields += 1;
                }
            });
        }

        // Calculate completion percentage
        const completionPercentage = Math.round((completedFields / totalFields) * 100);
        const isCompleted = completionPercentage === 100;

        // Update agent status if profile is complete
        if (isCompleted && agent.status === 'pending') {
            await agent.update({ status: 'active' });
        }

        return {
            success: true,
            message: isCompleted 
                ? 'Profile is complete' 
                : 'Profile is incomplete',
            isCompleted,
            completionPercentage,
            completionStatus,
            missingFields,
            data: {
                agent: {
                    agentId: agent.agentId,
                    email: agent.email,
                    status: agent.status
                },
                personalInfo: personalInfo
            }
        };
    } catch (error) {
        console.error('Validate profile completion error:', error);
        throw error;
    }
}; 
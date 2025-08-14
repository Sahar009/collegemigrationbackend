import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateOTP } from '../utils/otpGenerator.js';
import { JWT_SECRET, JWT_EXPIRES_IN, MESSAGES } from '../config/constants.js';
import { Agent } from '../schema/AgentSchema.js';
import { messageHandler, verifyPassword, migratePasswordHash } from '../utils/index.js';
import { sendEmail } from '../utils/sendEmail.js';
import { Op } from 'sequelize';
import { generateReference } from '../utils/reference.js';
import sequelize from '../database/db.js';
import { AgentPersonalInfo } from '../schema/AgentPersonalInfoSchema.js';


const baseUrl = process.env.FRONTEND_URL || "https://collegemigrationmain.vercel.app/";
// Agent Registration
export const registerAgent = async (data) => {
    const t = await sequelize.transaction();

    try {
        const {
            companyName,
            contactPerson,
            email,
            phone,
            password,
            address,
            country,
            ref,     // Referral code from URL query
            type,    // Referrer type from URL query
            id      // Referrer ID from URL query
        } = data;

        // Check if email already exists
        const existingAgent = await Agent.findOne({ 
            where: { email },
            transaction: t 
        });

        if (existingAgent) {
            await t.rollback();
            return messageHandler('Email already registered', false, 400);
        }

        // Generate unique referral code for the new agent
        const referralCode = generateReference('REF');

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create agent with pending status
        const newAgent = await Agent.create({
            companyName,
            contactPerson,
            email,
            phone,
            password: hashedPassword,
            address,
            country,
            status: 'pending',
            commissionRate: 0,
            referralCode // Add referral code to agent
        }, { transaction: t });

        // Create referral record if valid referral code was provided
        if (ref && type && id) {
            // Verify referral code format
            if (!validateReference(ref, 'REF')) {
                await t.rollback();
                return messageHandler("Invalid referral code format", false, 400);
            }

            // Verify referrer exists and owns this code
            const referrer = type === 'Agent' 
                ? await Agent.findOne({ 
                    where: { 
                        agentId: id,
                        referralCode: ref 
                    },
                    transaction: t
                })
                : await Member.findOne({ 
                    where: { 
                        memberId: id,
                        referralCode: ref 
                    },
                    transaction: t
                });

            if (!referrer) {
                await t.rollback();
                return messageHandler("Invalid referral code", false, 400);
            }

            // Create referral record
            await Referral.create({
                referralType: type,
                referrerId: id,
                memberId: newAgent.agentId,
                status: 'unpaid',
                statusDate: new Date()
            }, { transaction: t });
        }

        // Generate token for email verification
        const token = jwt.sign(
            { id: newAgent.agentId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send verification email
        await sendEmail({
            to: email,
            subject: 'Verify Your Agent Account',
            template: 'agentVerification',
            context: {
                name: contactPerson,
                verificationLink: `${baseUrl}/verify-agent/${token}`,
                referralCode, // Include referral code in email
                referralLink: `${baseUrl}/register?ref=${referralCode}&type=Agent&id=${newAgent.agentId}`
            }
        });

        await t.commit();

        return messageHandler(
            MESSAGES.AUTH.REGISTRATION_SUCCESS,
            true,
            201,
            {
                agentId: newAgent.agentId,
                email: newAgent.email,
                status: newAgent.status,
                referralCode,
                referralLink: `${baseUrl}/register?ref=${referralCode}&type=Agent&id=${newAgent.agentId}`
            }
        );

    } catch (error) {
        await t.rollback();
        console.error('Agent registration error:', error);
        return messageHandler(
            'Registration failed. Please try again.',
            false,
            500
        );
    }
};

// Login Agent
export const loginAgent = async (email, password) => {
    try {
        const agent = await Agent.findOne({ where: { email } });
        if (!agent) {
            return messageHandler(MESSAGES.AUTH.INVALID_CREDENTIALS, false, 401);
        }

        const isPasswordValid = await verifyPassword(password, agent.password, agent);
        if (!isPasswordValid) {
            return messageHandler(MESSAGES.AUTH.INVALID_CREDENTIALS, false, 401);
        }

        // Auto-migrate password hash if it's in PHP format
        if (agent.password.startsWith('$2y$')) {
            try {
                const migratedHash = await migratePasswordHash(password, agent.password);
                await agent.update({ password: migratedHash });
                console.log('Password hash migrated for agent:', email);
            } catch (migrationError) {
                console.error('Password migration failed for agent:', email, migrationError);
                // Continue with login even if migration fails
            }
        }

        // Generate referral link if not exists
        let referralCode = agent.referralCode;
        if (!referralCode) {
            referralCode = generateReference('REF');
            await agent.update({ referralCode });
        }

        const referralLink = `${baseUrl}/register?ref=${referralCode}&type=Agent&id=${agent.agentId}`;

        // Generate token
        const token = jwt.sign(
            { id: agent.agentId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return messageHandler('Login successful', true, 200, {
            agent: {
                agentId: agent.agentId,
                email: agent.email,
                status: agent.status
            },
            token,
            referralCode,
            referralLink
        });
    } catch (error) {
        console.error('Login error:', error);
        return messageHandler('Login failed', false, 500);
    }
};

// Forgot Password
export const forgotPassword = async (email) => {
    try {
        const agent = await Agent.findOne({ where: { email } });
        if (!agent) {
            throw new Error('Email not found');
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 30 * 60000); // 30 minutes

        // Update agent with OTP
        await agent.update({
            resetCode: otp,
            resetCodeExpiry: otpExpiry
        });

        // Send OTP email using agentResetPassword.ejs template
        await sendEmail({
            to: email,
            subject: 'Agent Password Reset Code - College Migration',
            template: 'agentResetPassword',
            context: {
                name: agent.contactPerson,
                email: email,
                resetCode: otp,
                socialLinks: {
                    Facebook: 'https://facebook.com/collegemigration',
                    Twitter: 'https://twitter.com/collegemigration',
                    LinkedIn: 'https://linkedin.com/company/collegemigration'
                }
            }
        });

        return messageHandler(
            'Password reset code sent to your email',
            true,
            200
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return messageHandler(
            error.message || 'Failed to process password reset request',
            false,
            400
        );
    }
};

// Reset Password
export const resetPassword = async (email, otp, newPassword) => {
    try {
        const agent = await Agent.findOne({
            where: {
                email,
                resetCode: otp,
                resetCodeExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!agent) {
            throw new Error('Invalid or expired OTP');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset code
        await agent.update({
            password: hashedPassword,
            resetCode: null,
            resetCodeExpiry: null
        });

        return {
            success: true,
            message: 'Password reset successful'
        };
    } catch (error) {
        throw error;
    }
};

// Verify Email
export const verifyEmail = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const agent = await Agent.findByPk(decoded.id);

        if (!agent) {
            throw new Error('Invalid verification token');
        }

        await agent.update({ emailVerified: true });

        return {
            success: true,
            message: 'Email verified successfully'
        };
    } catch (error) {
        throw error;
    }
};

// Change Password
export const changePassword = async (agentId, currentPassword, newPassword) => {
    try {
        
        if (!agentId) {
            throw new Error('Agent ID is required');
        }
        
        const agent = await Agent.findByPk(agentId);
        
        if (!agent) {
            throw new Error('Agent not found');
        }

        const isPasswordValid = await verifyPassword(currentPassword, agent.password, agent);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await agent.update({ password: hashedPassword });

        return {
            success: true,
            message: 'Password changed successfully'
        };
    } catch (error) {
        console.error('Password change service error:', error);
        throw error;
    }
};

// Refresh Token
export const refreshToken = async (agentId) => {
    try {
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        const token = jwt.sign(
            { 
                id: agent.agentId,
                email: agent.email,
                role: 'agent'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            success: true,
            data: { token }
        };
    } catch (error) {
        throw error;
    }
};

// Resend OTP
export const resendOTP = async (email) => {
    try {
        const agent = await Agent.findOne({ where: { email } });
        if (!agent) {
            return messageHandler('Email not found', false, 404);
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 30 * 60000); // 30 minutes

        // Update agent with new OTP
        await agent.update({
            resetCode: otp,
            resetCodeExpiry: otpExpiry
        });

        // Send new OTP email
        await sendEmail({
            to: email,
            subject: 'New Password Reset Code - College Migration',
            template: 'resetPassword',
            context: {
                name: agent.contactPerson,
                resetCode: otp,
                year: new Date().getFullYear(),
                socialLinks: {
                    Facebook: 'https://facebook.com/collegemigration',
                    Twitter: 'https://twitter.com/collegemigration',
                    LinkedIn: 'https://linkedin.com/company/collegemigration'
                }
            }
        });

        return messageHandler(
            'New password reset code sent to your email',
            true,
            200
        );
    } catch (error) {
        console.error('Resend OTP error:', error);
        return messageHandler(
            'Failed to resend password reset code',
            false,
            500
        );
    }
}; 

export const deleteAccount = async (agentId, password) => {
    try {
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        const isPasswordValid = await verifyPassword(password, agent.password, agent);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        await agent.destroy();

        return {
            success: true,
            message: 'Account deleted successfully'
        };
    } catch (error) {
        throw error;
    }
};

export const updateAgentPhoto = async (agentId, photoPath) => {
    try {
        const agentPersonalInfo = await AgentPersonalInfo.findOne({
            where: { agentId }
        });

        if (!agentPersonalInfo) {
            throw new Error('Agent personal information not found');
        }

        // Update only the photo field
        await agentPersonalInfo.update({ photo: photoPath });

        return {
            success: true,
            message: 'Profile photo updated successfully',
            data: {
                photo: photoPath
            }
        };
    } catch (error) {
        throw error;
    }
};

export const updateProfile = async (agentId, profileData) => {
    try {
        console.log(agentId, profileData)
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        // Update only allowed fields
        const allowedFields = [
            'companyName',
            'contactPerson',
            'email',
            'phone',
            'homeAddress',
            'homeCity',
            'homeState',
            'homeZipCode',
            'homeCountry'
        ];

        const filteredData = Object.keys(profileData)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = profileData[key];
                return obj;
            }, {});

        await agent.update(filteredData);

        return {
            success: true,
            message: 'Profile updated successfully',
            data: agent
        };
    } catch (error) {
        throw error;
    }
};
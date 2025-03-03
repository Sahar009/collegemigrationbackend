import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateOTP } from '../utils/otpGenerator.js';
import { JWT_SECRET, JWT_EXPIRES_IN, MESSAGES } from '../config/constants.js';
import { Agent } from '../schema/AgentSchema.js';
import { messageHandler } from '../utils/index.js';
import { sendEmail } from '../utils/sendEmail.js';
import { Op } from 'sequelize';

// Agent Registration
export const registerAgent = async (data) => {
    try {
        const {
            companyName,
            contactPerson,
            email,
            phone,
            password,
            address,
            country
        } = data;

        // Check if email already exists
        const existingAgent = await Agent.findOne({ where: { email } });
        if (existingAgent) {
            return messageHandler('Email already registered', false, 400);
        }

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
            commissionRate: 0
        });

        // Generate token for email verification
        const token = jwt.sign(
            { id: newAgent.agentId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send verification email with error handling
        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Agent Account',
                template: 'agentVerification',
                context: {
                    
                    name: contactPerson,
                    verificationLink: `${process.env.BASE_URL}/verify-agent/${token}`
                }
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Don't fail registration if email fails
            // But log it for monitoring
            console.log('Registration completed but verification email failed for:', email);
        }

        return messageHandler(
            MESSAGES.AUTH.REGISTRATION_SUCCESS,
            true,
            201,
            {
                agentId: newAgent.agentId,
                email: newAgent.email,
                status: newAgent.status
            }
        );

    } catch (error) {
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

        const isPasswordValid = await bcrypt.compare(password, agent.password);
        if (!isPasswordValid) {
            return messageHandler(MESSAGES.AUTH.INVALID_CREDENTIALS, false, 401);
        }

        // if (agent.status !== 'active') {
        //     return messageHandler(MESSAGES.AUTH.ACCOUNT_INACTIVE, false, 403);
        // }

        // Generate token with the exact same secret
        const token = jwt.sign(
            { id: agent.agentId },
            process.env.JWT_SECRET, // Make sure this matches your .env file
            { expiresIn: '24h' }
        );

        return messageHandler('Login successful', true, 200, {
            agent: {
                agentId: agent.agentId,
                email: agent.email,
                status: agent.status
            },
            token
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

        // Send OTP email using resetPassword.ejs template
        await sendEmail({
            to: email,
            subject: 'Password Reset Code - College Migration',
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
        const agent = await Agent.findByPk(agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, agent.password);
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
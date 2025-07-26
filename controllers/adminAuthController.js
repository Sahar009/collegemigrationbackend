import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../schema/AdminSchema.js';
import { messageHandler, hashPassword, verifyPassword, generateAdminToken, migratePasswordHash } from '../utils/index.js';
import { BAD_REQUEST, SUCCESS, UNAUTHORIZED } from '../constants/statusCode.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail.js';
import { Op } from 'sequelize';

// Admin login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Email and password are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const admin = await Admin.findOne({ where: { email } });
        
        if (!admin) {
            console.log('Admin not found with email:', email);
            return res.status(UNAUTHORIZED).json(
                messageHandler(
                    "Invalid credentials",
                    false,
                    UNAUTHORIZED
                )
            );
        }
        
        if (admin.status !== 'active') {
            return res.status(UNAUTHORIZED).json(
                messageHandler(
                    "Account is inactive. Please contact super admin",
                    false,
                    UNAUTHORIZED
                )
            );
        }
        
        // Use the utility function instead of direct bcrypt
        const isPasswordValid = await verifyPassword(password, admin.password, admin);
        
        if (!isPasswordValid) {
            console.log('Password validation failed for admin:', email);
            return res.status(UNAUTHORIZED).json(
                messageHandler(
                    "Invalid credentials",
                    false,
                    UNAUTHORIZED
                )
            );
        }
        
        // Auto-migrate password hash if it's in PHP format
        if (admin.password.startsWith('$2y$')) {
            try {
                const migratedHash = await migratePasswordHash(password, admin.password);
                await admin.update({ password: migratedHash });
                console.log('Password hash migrated for admin:', email);
            } catch (migrationError) {
                console.error('Password migration failed for admin:', email, migrationError);
                // Continue with login even if migration fails
            }
        }
        
        // Generate token using the utility function
        const token = generateAdminToken(admin);
        
        // Update last login
        await admin.update({ lastLogin: new Date() });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Login successful",
                true,
                SUCCESS,
                {
                    admin: {
                        id: admin.adminId,
                        username: admin.username,
                        email: admin.email,
                        fullName: admin.fullName,
                        role: admin.role
                    },
                    token
                }
            )
        );
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Get admin profile
export const getProfile = async (req, res) => {
    try {
        // Check if req.user exists (from JWT middleware) instead of req.admin
        if (!req.user) {
            return res.status(401).json(
                messageHandler(
                    "Unauthorized - Authentication required",
                    false,
                    401
                )
            );
        }
        
        // Use req.user.id instead of req.admin.id
        const adminId = req.user.id;
        
        // Add debugging to see what's in the request
        console.log('Auth user object:', req.user);
        
        const admin = await Admin.findByPk(adminId, {
            attributes: { exclude: ['password'] }
        });
        
        if (!admin) {
            return res.status(404).json(
                messageHandler(
                    "Admin not found",
                    false,
                    404
                )
            );
        }
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Profile retrieved successfully",
                true,
                SUCCESS,
                admin
            )
        );
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Update admin profile
export const updateProfile = async (req, res) => {
    try {
        const adminId =  req.user.id;
        const { fullName, email, username } = req.body;
        
        const admin = await Admin.findByPk(adminId);
        
        if (!admin) {
            return res.status(404).json(
                messageHandler(
                    "Admin not found",
                    false,
                    404
                )
            );
        }
        
        // Update fields
        await admin.update({
            fullName: fullName || admin.fullName,
            email: email || admin.email,
            username: username || admin.username
        });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Profile updated successfully",
                true,
                SUCCESS,
                {
                    id: admin.adminId,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.fullName,
                    role: admin.role
                }
            )
        );
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Change password
export const changePassword = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Current password and new password are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (newPassword.length < 8) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "New password must be at least 8 characters",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const admin = await Admin.findByPk(adminId);
        
        if (!admin) {
            return res.status(404).json(
                messageHandler(
                    "Admin not found",
                    false,
                    404
                )
            );
        }
        
        // Verify current password
        const isPasswordValid = await verifyPassword(currentPassword, admin.password, admin);
        
        if (!isPasswordValid) {
            return res.status(UNAUTHORIZED).json(
                messageHandler(
                    "Current password is incorrect",
                    false,
                    UNAUTHORIZED
                )
            );
        }
        
        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password
        await admin.update({ password: hashedPassword });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Password changed successfully",
                true,
                SUCCESS
            )
        );
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Forgot password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Email is required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const admin = await Admin.findOne({ where: { email } });
        
        if (!admin) {
            // For security reasons, don't reveal that the email doesn't exist
            return res.status(SUCCESS).json(
                messageHandler(
                    "If your email is registered, you will receive a password reset link",
                    true,
                    SUCCESS
                )
            );
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        
        // Save token to database
        await admin.update({
            resetToken,
            resetTokenExpiry
        });
        
        // Send email with reset link
        const resetLink = `${process.env.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
        console.log(resetLink)
        await sendEmail({
            to: admin.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Please use the following link to reset your password: ${resetLink}`,
            html: `<p>You requested a password reset.</p><p>Please use the following link to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link will expire in 1 hour.</p>`
        });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "If your email is registered, you will receive a password reset link",
                true,
                SUCCESS
            )
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Reset password
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Token and new password are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (newPassword.length < 8) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "New password must be at least 8 characters",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const admin = await Admin.findOne({
            where: {
                resetToken: token,
                resetTokenExpiry: { [Op.gt]: new Date() }
            }
        });
        
        if (!admin) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Invalid or expired token",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password and clear reset token
        await admin.update({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Password reset successful",
                true,
                SUCCESS
            )
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Create admin (super admin only)
export const createAdmin = async (req, res) => {
    try {
        const { username, email, password, fullName, role } = req.body;
        
        if (!username || !email || !password || !fullName || !role) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "All fields are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (password.length < 8) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Password must be at least 8 characters",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        // Check if email or username already exists
        const existingAdmin = await Admin.findOne({
            where: {
                [Op.or]: [
                    { email },
                    { username }
                ]
            }
        });
        
        if (existingAdmin) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Email or username already exists",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        console.log('Creating admin with email:', email);
        
        // Create admin with plain password - the hook will hash it
        const newAdmin = await Admin.create({
            username,
            email,
            password, // Pass the plain password, the hook will hash it
            fullName,
            role,
            status: 'active'
        });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Admin created successfully",
                true,
                SUCCESS,
                {
                    id: newAdmin.adminId,
                    username: newAdmin.username,
                    email: newAdmin.email,
                    fullName: newAdmin.fullName,
                    role: newAdmin.role
                }
            )
        );
    } catch (error) {
        console.error('Create admin error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Get all admins (super admin only)
export const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.findAll({
            attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] }
        });
        
        return res.status(SUCCESS).json(
            messageHandler(
                "Admins retrieved successfully",
                true,
                SUCCESS,
                admins
            )
        );
    } catch (error) {
        console.error('Get all admins error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Update admin status (super admin only)
export const updateAdminStatus = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { status } = req.body;
        
        if (!adminId) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Admin ID is required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Valid status (active/inactive) is required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const admin = await Admin.findByPk(adminId);
        
        if (!admin) {
            return res.status(404).json(
                messageHandler(
                    "Admin not found",
                    false,
                    404
                )
            );
        }
        
        // Prevent deactivating own account
        if (admin.adminId === req.admin.id) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Cannot update your own status",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        await admin.update({ status });
        
        return res.status(SUCCESS).json(
            messageHandler(
                `Admin ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
                true,
                SUCCESS,
                {
                    id: admin.adminId,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.fullName,
                    role: admin.role,
                    status: admin.status
                }
            )
        );
    } catch (error) {
        console.error('Update admin status error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
}; 
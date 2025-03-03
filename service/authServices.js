import { 
    messageHandler, 
    hashPassword, 
    generateToken, 
    verifyPassword, 
    sanitizePhoneNumber,
} from '../utils/index.js';
import { BAD_REQUEST, SUCCESS, UNAUTHORIZED } from '../constants/statusCode.js';
import { Member } from '../schema/memberSchema.js';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebaseConfig.js';
import admin from '../config/firebaseAdmin.js';
import { sendEmail } from '../utils/sendEmail.js';

// Generate random 4-digit code
const generateResetCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

export const registerService = async (data, callback) => {
    try {
        const {
            firstname,
            lastname,
            email,
            password
        } = data;

        // Check if email exists
        const existingMember = await Member.findOne({ where: { email } });
        if (existingMember) {
            return callback(
                messageHandler("Email already exists", false, BAD_REQUEST)
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create new member
        const newMember = await Member.create({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            memberStatus: 'PENDING'
        });

        // Send welcome email with correct context variables
        await sendEmail({
            to: email,
            subject: 'Welcome to College Migration',
            template: 'welcome',
            context: {
                firstname: firstname, // Make sure this matches the variable in the EJS template
                year: new Date().getFullYear(),
                socialLinks: {
                    Facebook: 'https://facebook.com/collegemigration',
                    Twitter: 'https://twitter.com/collegemigration',
                    LinkedIn: 'https://linkedin.com/company/collegemigration'
                }
            }
        });

        // Generate token
        const tokenPayload = {
            id: newMember.memberId,
            email: newMember.email
        };
        const token = generateToken(tokenPayload);

        return callback(
            messageHandler("Registration successful", true, SUCCESS, {
                member: {
                    memberId: newMember.memberId,
                    email: newMember.email,
                    firstname: newMember.firstname,
                    lastname: newMember.lastname,
                    memberStatus: newMember.memberStatus
                },
                token
            })
        );

    } catch (error) {
        console.error('Registration error:', error);
        return callback(
            messageHandler("An error occurred during registration", false, BAD_REQUEST)
        );
    }
};

export const loginService = async (data, callback) => {
    try {
        const { email, password } = data;

        // Find member
        const member = await Member.findOne({ where: { email } });
        if (!member) {
            return callback(
                messageHandler("User does not exist, kidly register", false, UNAUTHORIZED)
            );
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, member.password);
        if (!isValidPassword) {
            return callback(
                messageHandler("Invalid credentials", false, UNAUTHORIZED)
            );
        }

        // Generate token
        const tokenPayload = {
            id: member.memberId,
            email: member.email
        };
        const token = generateToken(tokenPayload);

        // Prepare response data
        const responseData = {
            member: {
                memberId: member.memberId,
                email: member.email,
                firstname: member.firstname,
                lastname: member.lastname,
                memberStatus: member.memberStatus
            },
            token
        };

        return callback(
            messageHandler("Login successful", true, SUCCESS, responseData)
        );

    } catch (error) {
        console.error('Login error:', error);
        return callback(
            messageHandler("An error occurred during login", false, BAD_REQUEST)
        );
    }
};

export const getAllUsersService = async (callback) => {
    try {
        const members = await Member.findAll();

        if (!members.length) {
            return callback(
                messageHandler("No members found", true, SUCCESS, [])
            );
        }

        return callback(
            messageHandler("Members retrieved successfully", true, SUCCESS, members)
        );

    } catch (error) {
        console.error('Get all users error:', error);
        return callback(
            messageHandler("An error occurred while fetching members", false, BAD_REQUEST)
        );
    }
};

export const googleAuthService = async (idToken, callback) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture } = decodedToken;

        // Split the name into first and last name
        const [firstname = '', lastname = ''] = name ? name.split(' ') : ['', ''];

        // Check if user exists
        let member = await Member.findOne({ where: { email } });

        if (!member) {
            // Create new member
            member = await Member.create({
                firstname,
                lastname,
                email,
                photo: picture,
                password: 'GOOGLE_AUTH', // Consider a more secure approach
                memberStatus: 'ACTIVE'
            });
        }

        // Generate token
        const tokenPayload = {
            id: member.memberId,
            email: member.email
        };
        const token = generateToken(tokenPayload);

        return callback(
            messageHandler("Google authentication successful", true, SUCCESS, {
                member: {
                    memberId: member.memberId,
                    email: member.email,
                    firstname: member.firstname,
                    lastname: member.lastname,
                    memberStatus: member.memberStatus,
                    photo: member.photo
                },
                token
            })
        );

    } catch (error) {
        console.error('Google authentication error:', error);
        return callback(
            messageHandler(
                error.message || "Authentication failed",
                false,
                BAD_REQUEST
            )
        );
    }
};

export const getUserProfileService = async (memberId, callback) => {
    try {
        const member = await Member.findByPk(memberId);

        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Prepare response data excluding sensitive information
        const profileData = {
            memberId: member.memberId,
            firstname: member.firstname,
            lastname: member.lastname,
            othernames: member.othernames,
            email: member.email,
            phone: member.phone,
            gender: member.gender,
            dob: member.dob,
            homeAddress: member.homeAddress,
            homeCity: member.homeCity,
            homeZipCode: member.homeZipCode,
            homeState: member.homeState,
            homeCountry: member.homeCountry,
            idType: member.idType,
            idNumber: member.idNumber,
            idScanFront: member.idScanFront,
            idScanBack: member.idScanBack,
            nationality: member.nationality,
            schengenVisaHolder: member.schengenVisaHolder,
            photo: member.photo,
            memberStatus: member.memberStatus,
            regDate: member.regDate,
            lastUpdate: member.lastUpdate
        };

        return callback(
            messageHandler("Profile retrieved successfully", true, SUCCESS, profileData)
        );

    } catch (error) {
        console.error('Get profile error:', error);
        return callback(
            messageHandler("An error occurred while fetching profile", false, BAD_REQUEST)
        );
    }
};

export const forgotPasswordService = async (email, callback) => {
    try {
        // Find member
        const member = await Member.findOne({ where: { email } });
        if (!member) {
            return callback(
                messageHandler("Email does not exist try Registering", true, SUCCESS)
            );
        }

        // Generate reset code
        const resetCode = generateResetCode();
        console.log(resetCode);
        // Save reset code and expiry
        await member.update({
            resetCode,
            resetCodeExpiry: new Date(Date.now() + 30 * 60 * 1000)
        });

        // Send email with template
        await sendEmail({
            to: email,
            subject: 'Reset Your Password - College Migration',
            template: 'resetPassword',
            context: {
                firstname: member.firstname,
                resetCode,
                year: new Date().getFullYear(),
                companyName: 'College Migration',
                socialLinks: {
                    youtube: 'https://www.youtube.com',
                    linkedin: 'https://www.linkedin.com',
                    facebook: 'https://www.facebook.com',
                    instagram: 'https://www.instagram.com',
                    twitter: 'https://www.twitter.com'
                }
            }
        });

        return callback(
            messageHandler("Password reset instructions sent to your email", true, SUCCESS)
        );

    } catch (error) {
        console.error('Forgot password error:', error);
        return callback(
            messageHandler("An error occurred while processing your request", false, BAD_REQUEST)
        );
    }
};

export const verifyResetCodeService = async (email, resetCode, callback) => {
    try {
        const member = await Member.findOne({ where: { email } });
        if (!member) {
            return callback(
                messageHandler("Invalid reset code", false, BAD_REQUEST)
            );
        }

        // Check if reset code matches and is not expired
        if (member.resetCode !== resetCode || 
            new Date() > new Date(member.resetCodeExpiry)) {
            return callback(
                messageHandler("Invalid or expired reset code", false, BAD_REQUEST)
            );
        }

        return callback(
            messageHandler("Reset code verified", true, SUCCESS)
        );

    } catch (error) {
        console.error('Verify reset code error:', error);
        return callback(
            messageHandler("An error occurred", false, BAD_REQUEST)
        );
    }
};

export const resetPasswordService = async (email, resetCode, newPassword, callback) => {
    try {
        const member = await Member.findOne({ where: { email } });
        if (!member) {
            return callback(
                messageHandler("User not found, kindly register", false, BAD_REQUEST)
            );
        }

        // Verify reset code again
        if (member.resetCode !== resetCode) {
            return callback(
                messageHandler("Invalid or expired reset code", false, BAD_REQUEST)
            );
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password and clear reset code
        await member.update({
            password: hashedPassword,
            resetCode: null,
            resetCodeExpiry: null
        });

        return callback(
            messageHandler("Password reset successful", true, SUCCESS)
        );

    } catch (error) {
        console.error('Reset password error:', error);
        return callback(
            messageHandler("An error occurred", false, BAD_REQUEST)
        );
    }
};

export const updatePasswordService = async (memberId, currentPassword, newPassword, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Verify current password
        const isValidPassword = await verifyPassword(currentPassword, member.password);
        if (!isValidPassword) {
            return callback(
                messageHandler("Current password is incorrect", false, UNAUTHORIZED)
            );
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await member.update({ password: hashedPassword });

        return callback(
            messageHandler("Password updated successfully", true, SUCCESS)
        );

    } catch (error) {
        console.error('Update password error:', error);
        return callback(
            messageHandler("An error occurred", false, BAD_REQUEST)
        );
    }
};

export const resendResetCodeService = async (email, callback) => {
    try {
        // Find member
        const member = await Member.findOne({ where: { email } });
        if (!member) {
            return callback(
                messageHandler("If email exists, a new code will be sent", true, SUCCESS)
            );
        }

        // Generate new reset code
        const resetCode = generateResetCode();
        
        // Update reset code and expiry
        await member.update({
            resetCode,
            resetCodeExpiry: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
        });

        // Send email with new code
        await sendEmail({
            to: email,
            subject: 'New Reset Code - College Migration',
            template: 'resetPassword',
            context: {
                firstname: member.firstname,
                resetCode,
                year: new Date().getFullYear(),
                companyName: 'College Migration',
                socialLinks: {
                    youtube: 'https://www.youtube.com',
                    linkedin: 'https://www.linkedin.com',
                    facebook: 'https://www.facebook.com',
                    instagram: 'https://www.instagram.com',
                    twitter: 'https://www.twitter.com'
                }
            }
        });

        return callback(
            messageHandler("New reset code sent to your email", true, SUCCESS)
        );

    } catch (error) {
        console.error('Resend reset code error:', error);
        return callback(
            messageHandler("An error occurred while sending new code", false, BAD_REQUEST)
        );
    }
};

export const deleteAccountService = async (memberId, password, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Verify password before deletion
        const isValidPassword = await verifyPassword(password, member.password);
        if (!isValidPassword) {
            return callback(
                messageHandler("Invalid password", false, UNAUTHORIZED)
            );
        }

        // Delete the member
        await member.destroy();

        return callback(
            messageHandler("Account deleted successfully", true, SUCCESS)
        );

    } catch (error) {
        console.error('Delete account error:', error);
        return callback(
            messageHandler("An error occurred while deleting account", false, BAD_REQUEST)
        );
    }
};



import { 
    messageHandler, 
    hashPassword, 
    generateToken, 
    verifyPassword, 
    sanitizePhoneNumber 
} from '../utils/index.js';
import { BAD_REQUEST, SUCCESS, UNAUTHORIZED } from '../constants/statusCode.js';
import { MemberAgent } from '../schema/memberAgentSchema.js';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebaseConfig.js';
import admin from '../config/firebaseAdmin.js';



export const registerService = async (data, callback) => {
    try {
        const {
            firstname,
            lastname,
            email,
            phone,
            gender,
            photo,
            businessName,
            password
        } = data;

        // Check if email exists
        const existingAgent = await MemberAgent.findOne({ where: { email } });
        if (existingAgent) {
            return callback(
                messageHandler("Email already exists", false, BAD_REQUEST)
            );
        }

        // Validate and sanitize phone number
        if (phone) {
            const phoneValidation = sanitizePhoneNumber(phone);
            if (!phoneValidation.status) {
                return callback(
                    messageHandler(phoneValidation.message, false, BAD_REQUEST)
                );
            }
            data.phone = phoneValidation.phone;
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create new agent
        const newAgent = await MemberAgent.create({
            firstname,
            lastname,
            email,
            phone: data.phone,
            gender,
            photo,
            businessName,
            password: hashedPassword
        });

        // Generate token
        const tokenPayload = {
            id: newAgent.agentId,
            email: newAgent.email
        };
        const token = generateToken(tokenPayload);

        // Prepare response data
        const responseData = {
            agent: {
                agentId: newAgent.agentId,
                email: newAgent.email,
                firstname: newAgent.firstname,
                lastname: newAgent.lastname,
                businessName: newAgent.businessName,
                agentStatus: newAgent.agentStatus
            },
            token
        };

        return callback(
            messageHandler("Registration successful", true, SUCCESS, responseData)
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

        // Find agent
        const agent = await MemberAgent.findOne({ where: { email } });
        if (!agent) {
            return callback(
                messageHandler("Invalid credentials", false, UNAUTHORIZED)
            );
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, agent.password);
        if (!isValidPassword) {
            return callback(
                messageHandler("Invalid credentials", false, UNAUTHORIZED)
            );
        }

        // Generate token
        const tokenPayload = {
            id: agent.agentId,
            email: agent.email
        };
        const token = generateToken(tokenPayload);

        // Prepare response data
        const responseData = {
            agent: {
                agentId: agent.agentId,
                email: agent.email,
                firstname: agent.firstname,
                lastname: agent.lastname,
                businessName: agent.businessName,
                agentStatus: agent.agentStatus
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

// ... existing code ...

export const getAllUsersService = async (callback) => {
    try {
        const agents = await MemberAgent.findAll();

        if (!agents.length) {
            return callback(
                messageHandler("No agents found", true, SUCCESS, [])
            );
        }

        return callback(
            messageHandler("Agents retrieved successfully", true, SUCCESS, agents)
        );

    } catch (error) {
        console.error('Get all users error:', error);
        return callback(
            messageHandler("An error occurred while fetching agents", false, BAD_REQUEST)
        );
    }
};

export const googleAuthService = async (idToken, callback) => {
    try {
        // Verify the ID token using Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Extract user info from decoded token
        const { 
            email, 
            name, 
            picture,
            given_name: firstName,
            family_name: lastName
        } = decodedToken;

        // Check if user exists in your database
        let agent = await MemberAgent.findOne({ where: { email } });

        if (!agent) {
            // Create new agent if doesn't exist
            agent = await MemberAgent.create({
                firstname: firstName || name?.split(' ')[0] || '',
                lastname: lastName || name?.split(' ')[1] || '',
                email,
                photo: picture,
                businessName: `${name || email}'s Business`,
                password: 'GOOGLE_AUTH',
                agentStatus: 'ACTIVE',
                regDate: new Date()
            });
        }

        // Generate token for your application
        const tokenPayload = {
            id: agent.agentId,
            email: agent.email
        };
        const token = generateToken(tokenPayload);

        return callback(
            messageHandler("Google authentication successful", true, SUCCESS, {
                agent: {
                    agentId: agent.agentId,
                    email: agent.email,
                    firstname: agent.firstname,
                    lastname: agent.lastname,
                    businessName: agent.businessName,
                    agentStatus: agent.agentStatus,
                    photo: agent.photo
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

export const getUserProfileService = async (agentId, callback) => {
    try {
        const agent = await MemberAgent.findByPk(agentId);

        if (!agent) {
            return callback(
                messageHandler("Agent not found", false, BAD_REQUEST)
            );
        }

        // Prepare response data excluding sensitive information
        const profileData = {
            agentId: agent.agentId,
            firstname: agent.firstname,
            lastname: agent.lastname,
            email: agent.email,
            phone: agent.phone,
            gender: agent.gender,
            photo: agent.photo,
            businessName: agent.businessName,
            agentStatus: agent.agentStatus,
            regDate: agent.regDate
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
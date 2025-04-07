import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import { messageHandler } from '../utils/index.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import AgentStudent from '../schema/AgentStudentSchema.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import Application from '../schema/ApplicationSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import Wallet from '../schema/WalletSchema.js';
import Referral from '../schema/ReferralSchema.js';
import { Program } from '../schema/programSchema.js';
import { ApplicationDocument } from '../schema/applicationDocumentSchema.js';
import AgentTransaction from '../schema/AgentTransactionSchema.js';
import sequelize from '../database/db.js';
import { Transaction } from '../schema/transactionSchema.js';
import { sendEmail } from '../utils/sendEmail.js';


const generateTempPassword = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get all users (members and agents) with pagination and filtering
export const getAllUsersService = async (query) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            userType = 'all', 
            status, 
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let memberData = { count: 0, rows: [] };
        let agentData = { count: 0, rows: [] };
        
        // Build filter conditions
        const memberWhere = {};
        const agentWhere = {};
        
        if (status) {
            memberWhere.memberStatus = status;
            agentWhere.status = status;
        }
        
        if (search) {
            const searchCondition = {
                [Op.or]: [
                    { email: { [Op.like]: `%${search}%` } },
                    { firstname: { [Op.like]: `%${search}%` } },
                    { lastname: { [Op.like]: `%${search}%` } }
                ]
            };
            
            Object.assign(memberWhere, searchCondition);
            
            // For agents, adjust the search fields
            const agentSearchCondition = {
                [Op.or]: [
                    { email: { [Op.like]: `%${search}%` } },
                    { companyName: { [Op.like]: `%${search}%` } },
                    { contactPerson: { [Op.like]: `%${search}%` } }
                ]
            };
            
            Object.assign(agentWhere, agentSearchCondition);
        }
        
        // Get members if requested
        if (userType === 'all' || userType === 'member') {
            memberData = await Member.findAndCountAll({
                where: memberWhere,
                attributes: [
                    'memberId', 'firstname', 'lastname', 'email', 
                    'phone', 'memberStatus', 'createdAt'
                ],
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]]
            });
        }
        
        // Get agents if requested
        if (userType === 'all' || userType === 'agent') {
            agentData = await Agent.findAndCountAll({
                where: agentWhere,
                attributes: [
                    'agentId', 'companyName', 'contactPerson', 'email', 
                    'phone', 'status', 'createdAt'
                ],
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]]
            });
        }
        
        // Combine and format results
        let users = [];
        let totalCount = 0;
        
        if (userType === 'all') {
            // Map members to a common format
            const formattedMembers = memberData.rows.map(member => ({
                id: member.memberId,
                type: 'member',
                name: `${member.firstname} ${member.lastname}`,
                email: member.email,
                phone: member.phone,
                status: member.memberStatus,
                createdAt: member.createdAt
            }));
            
            // Map agents to a common format
            const formattedAgents = agentData.rows.map(agent => ({
                id: agent.agentId,
                type: 'agent',
                name: agent.companyName,
                contactPerson: agent.contactPerson,
                email: agent.email,
                phone: agent.phone,
                status: agent.status,
                createdAt: agent.createdAt
            }));
            
            // Combine and sort
            users = [...formattedMembers, ...formattedAgents].sort((a, b) => {
                if (sortOrder === 'DESC') {
                    return new Date(b[sortBy]) - new Date(a[sortBy]);
                }
                return new Date(a[sortBy]) - new Date(b[sortBy]);
            });
            
            // Apply pagination to combined results
            users = users.slice(offset, offset + parseInt(limit));
            totalCount = memberData.count + agentData.count;
        } else if (userType === 'member') {
            users = memberData.rows.map(member => ({
                id: member.memberId,
                type: 'member',
                name: `${member.firstname} ${member.lastname}`,
                email: member.email,
                phone: member.phone,
                status: member.memberStatus,
                createdAt: member.createdAt
            }));
            totalCount = memberData.count;
        } else {
            users = agentData.rows.map(agent => ({
                id: agent.agentId,
                type: 'agent',
                name: agent.companyName,
                contactPerson: agent.contactPerson,
                email: agent.email,
                phone: agent.phone,
                status: agent.status,
                createdAt: agent.createdAt
            }));
            totalCount = agentData.count;
        }
        
        return messageHandler(
            'Users retrieved successfully',
            true,
            200,
            {
                users,
                pagination: {
                    totalItems: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    currentPage: parseInt(page),
                    pageSize: parseInt(limit)
                }
            }
        );
    } catch (error) {
        console.error('Get all users error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve users',
            false,
            500
        );
    }
};

// Get user details by ID and type
export const getUserDetailsService = async (userId, userType) => {
    try {
        let result = {};
        
        if (userType === 'member') {
            // Get basic member info
            const member = await Member.findByPk(userId);
            
            if (!member) {
                return messageHandler('Member not found', false, 404);
            }
            
            result = member.toJSON();
            
            // Get member's applications separately
            try {
                const applications = await Application.findAll({
                    where: { memberId: userId },
                    include: [
                        {
                            model: Program,
                            as: 'program'
                        }
                    ]
                });
                result.applications = applications || [];
            } catch (appError) {
                console.error('Error fetching applications:', appError);
                result.applications = [];
            }
            
            // Get member's documents separately
            try {
                const documents = await sequelize.query(
                    `SELECT * FROM application_documents WHERE memberId = :memberId`,
                    {
                        replacements: { memberId: userId },
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                result.documents = documents || [];
            } catch (docError) {
                console.error('Error fetching documents:', docError);
                result.documents = [];
            }
            
            // Get member's transactions separately
            try {
                const transactions = await Transaction.findAll({
                    where: { memberId: userId }
                });
                result.transactions = transactions || [];
            } catch (txError) {
                console.error('Error fetching transactions:', txError);
                result.transactions = [];
            }
            
            // Get member's wallet separately
            try {
                const wallet = await Wallet.findOne({
                    where: { 
                        userId: userId,
                        userType: 'member'
                    }
                });
                result.wallet = wallet || null;
            } catch (walletError) {
                console.error('Error fetching wallet:', walletError);
                result.wallet = null;
            }
            
            // Get member's referrals separately
            try {
                const referrals = await sequelize.query(
                    `SELECT * FROM referrals WHERE memberId = :memberId`,
                    {
                        replacements: { memberId: userId },
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                result.referrals = referrals || [];
            } catch (refError) {
                console.error('Error fetching referrals:', refError);
                result.referrals = [];
            }
            
        } else if (userType === 'agent') {
            // Get basic agent info
            const agent = await Agent.findByPk(userId);
            
            if (!agent) {
                return messageHandler('Agent not found', false, 404);
            }
            
            result = agent.toJSON();
            
            // Get agent's students separately
            try {
                const students = await AgentStudent.findAll({
                    where: { agentId: userId }
                });
                
                // Get student IDs for further queries
                const studentIds = students.map(student => student.memberId);
                
                // Get student documents using raw query
                let studentDocuments = [];
                if (studentIds.length > 0) {
                    // Use string concatenation for the IN clause instead of Op.in
                    const studentIdsStr = studentIds.join(',');
                    studentDocuments = await sequelize.query(
                        `SELECT * FROM agent_student_documents WHERE agentId = :agentId AND memberId IN (${studentIdsStr})`,
                        {
                            replacements: { agentId: userId },
                            type: sequelize.QueryTypes.SELECT
                        }
                    );
                }
                
                // Get agent's applications separately
                const applications = await AgentApplication.findAll({
                    where: { agentId: userId },
                    include: [
                        {
                            model: Program,
                            as: 'program'
                        }
                    ]
                });
                
                // Add student details to each student
                if (students.length > 0) {
                    result.students = students.map(student => {
                        const studentData = student.toJSON();
                        
                        // Add documents for this student
                        studentData.documents = studentDocuments.filter(
                            doc => doc.memberId === student.memberId
                        );
                        
                        // Add applications for this student
                        studentData.applications = applications.filter(
                            app => app.memberId === student.memberId
                        );
                        
                        return studentData;
                    });
                } else {
                    result.students = [];
                }
                
                // Add applications to result
                result.applications = applications || [];
                
            } catch (studentError) {
                console.error('Error fetching students:', studentError);
                result.students = [];
                result.applications = [];
            }
            
            // Get agent's transactions separately
            try {
                const transactions = await AgentTransaction.findAll({
                    where: { agentId: userId }
                });
                result.transactions = transactions || [];
            } catch (txError) {
                console.error('Error fetching transactions:', txError);
                result.transactions = [];
            }
            
            // Get agent's wallet separately
            try {
                const wallet = await Wallet.findOne({
                    where: { 
                        userId: userId,
                        userType: 'agent'
                    }
                });
                result.wallet = wallet || null;
            } catch (walletError) {
                console.error('Error fetching wallet:', walletError);
                result.wallet = null;
            }
            
            // Get agent's referrals separately
            try {
                const referrals = await sequelize.query(
                    `SELECT * FROM referrals WHERE referrerId = :agentId AND referrerType = 'agent'`,
                    {
                        replacements: { agentId: userId },
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                result.referrals = referrals || [];
            } catch (refError) {
                console.error('Error fetching referrals:', refError);
                result.referrals = [];
            }
        } else {
            return messageHandler('Invalid user type', false, 400);
        }
        
        return messageHandler(
            'User details retrieved successfully',
            true,
            200,
            result
        );
    } catch (error) {
        console.error('Get user details error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve user details',
            false,
            500
        );
    }
};

// Update user status (activate/deactivate)
export const updateUserStatusService = async (userId, userType, status) => {
    try {
        let user;
        
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (!user) {
                return messageHandler('Member not found', false, 404);
            }
            
            await user.update({ memberStatus: status });
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (!user) {
                return messageHandler('Agent not found', false, 404);
            }
            
            await user.update({ status });
        } else {
            return messageHandler('Invalid user type', false, 400);
        }
        
        return messageHandler(
            `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
            true,
            200,
            user
        );
    } catch (error) {
        console.error('Update user status error:', error);
        return messageHandler(
            error.message || 'Failed to update user status',
            false,
            500
        );
    }
};

// Reset user password
export const resetUserPasswordService = async (userId, userType, newPassword) => {
    try {
        let user;
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (!user) {
                return messageHandler('Member not found', false, 404);
            }
            
            await user.update({ password: hashedPassword });
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (!user) {
                return messageHandler('Agent not found', false, 404);
            }
            
            await user.update({ password: hashedPassword });
        } else {
            return messageHandler('Invalid user type', false, 400);
        }
        
        return messageHandler(
            'Password reset successfully',
            true,
            200
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return messageHandler(
            error.message || 'Failed to reset password',
            false,
            500
        );
    }
};

// Add this new service function
export const updateUserDetailsService = async (userId, userType, updateData) => {
    try {
        // Remove password-related fields from update data
        delete updateData.password;
        delete updateData.confirmPassword;
        delete updateData.newPassword;
        delete updateData.currentPassword;

        let user;
        
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (!user) {
                return messageHandler('Member not found', false, 404);
            }
            
            // Filter allowed fields for member updates
            const allowedFields = [
                'firstname', 'lastname', 'email', 'phone', 
                'address', 'country', 'dateOfBirth', 'memberStatus'
            ];
            
            const filteredUpdate = Object.keys(updateData)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = updateData[key];
                    return obj;
                }, {});

            await user.update(filteredUpdate);
            
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (!user) {
                return messageHandler('Agent not found', false, 404);
            }
            
            // Filter allowed fields for agent updates
            const allowedFields = [
                'companyName', 'contactPerson', 'email', 'phone',
                'address', 'country', 'commissionRate', 'status'
            ];
            
            const filteredUpdate = Object.keys(updateData)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = updateData[key];
                    return obj;
                }, {});

            await user.update(filteredUpdate);
            
        } else {
            return messageHandler('Invalid user type', false, 400);
        }

        return messageHandler(
            'User details updated successfully',
            true,
            200,
            user
        );
    } catch (error) {
        console.error('Update user details error:', error);
        return messageHandler(
            error.message || 'Failed to update user details',
            false,
            500
        );
    }
}; 

// Update user document
export const updateUserDocumentService = async (documentId, documentType, updateData, adminId) => {
    try {
        let documentModel;
        let document;
        
        // Determine which document type to update
        switch(documentType.toLowerCase()) {
            case 'application':
                documentModel = ApplicationDocument;
                break;
            case 'agent-student':
                documentModel = AgentStudentDocument;
                break;
            default:
                return messageHandler('Invalid document type', false, 400);
        }
        
        // Find the document
        document = await documentModel.findByPk(documentId);
        
        if (!document) {
            return messageHandler('Document not found', false, 404);
        }
        
        // Prepare allowed updates
        const allowedUpdates = {
            status: ['pending', 'approved', 'rejected'],
            adminComment: updateData.adminComment || null,
            reviewedBy: adminId,
            reviewedAt: new Date()
        };
        
        // Validate status transition
        const currentStatus = document.status;
        const newStatus = updateData.status || currentStatus;
        
        if (newStatus !== currentStatus) {
            if (!allowedUpdates.status.includes(newStatus)) {
                return messageHandler('Invalid document status', false, 400);
            }
            
            // Add status change validation rules if needed
            // Example: if (currentStatus === 'approved' && newStatus === 'pending') {...}
        }
        
        // Update document
        const updatePayload = {
            status: newStatus,
            adminComment: allowedUpdates.adminComment,
            reviewedBy: allowedUpdates.reviewedBy,
            reviewedAt: allowedUpdates.reviewedAt
        };
        
        await document.update(updatePayload);
        
        return messageHandler(
            'Document updated successfully',
            true,
            200,
            document
        );
    } catch (error) {
        console.error('Update document error:', error);
        return messageHandler(
            error.message || 'Failed to update document',
            false,
            500
        );
    }
}; 

export const createMemberService = async (memberData) => {
    try {
        // Validate required fields based on schema
        const requiredFields = [
           'email', 'firstname', 'lastname', 'othernames',
            'phone', 'gender', 'dob', 'homeAddress', 'homeCity',
            'homeZipCode', 'homeState', 'homeCountry', 'idType',
            'idNumber', 'idScanFront', 'nationality',
            'schengenVisaHolder', 'photo'

        ];
        
        const missingFields = requiredFields.filter(field => !memberData[field]);
        if (missingFields.length > 0) {
           
            return messageHandler(
                `Missing required fields: ${missingFields.join(', ')}`,
                false,
                400
            );
        }

        // Check for duplicate email
        const existingMember = await Member.findOne({
            where: { email: memberData.email }
        });
        
        if (existingMember) {
            return messageHandler('Email already exists', false, 409);
        }

        // Generate temporary password
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Filter valid fields from memberData
        const validFields = [
            'email', 'firstname', 'lastname', 'othernames',
            'phone', 'gender', 'dob', 'homeAddress', 'homeCity',
            'homeZipCode', 'homeState', 'homeCountry', 'idType',
            'idNumber', 'idScanFront', 'nationality',
            'schengenVisaHolder', 'photo'
        ];
        
        const filteredData = Object.keys(memberData)
            .filter(key => validFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = memberData[key];
                return obj;
            }, {});

        // Create member with validated data
        const newMember = await Member.create({
            ...filteredData,
            password: hashedPassword,
            memberStatus: 'active', // Override default for admin-created
            emailVerified: true
        });

        // Send welcome email with temp password (implement separately)
        await sendEmail(newMember.email, tempPassword);
        
        return messageHandler(
            'Member created successfully',
            true,
            201,
            {
                memberId: newMember.memberId,
                tempPassword: tempPassword // Only return in development!
            }
        );
    } catch (error) {
        console.error('Create member error:', error);
        return messageHandler(
            error.message || 'Failed to create member',
            false,
            500
        );
    }
}; 

export const uploadUserDocumentsService = async (userId, userType, files, adminId) => {
    try {
        const documentTypeMap = {
            // Application Documents (member)
            internationalPassport: 'PASSPORT',
            olevelResult: 'OLEVEL_RESULT',
            olevelPin: 'OLEVEL_PIN',
            academicReferenceLetter: 'REFERENCE_LETTER',
            resume: 'RESUME',
            universityDegreeCertificate: 'DEGREE_CERTIFICATE',
            universityTranscript: 'TRANSCRIPT',
            sop: 'STATEMENT_OF_PURPOSE',
            researchDocs: 'RESEARCH_DOCUMENTS',
            languageTestCert: 'LANGUAGE_TEST',
            photo: 'PHOTO',
            idScanFront: 'ID_FRONT',
           
        };

        let documentModel;
        const commonData = {
            reviewedBy: adminId,
            reviewedAt: new Date(),
            status: 'pending'
        };

        // Determine model and additional fields
        switch(userType) {
            case 'member':
                documentModel = ApplicationDocument;
                commonData.memberId = userId;
                break;
            case 'agent-student':
                documentModel = AgentStudentDocument;
                commonData.memberId = userId;
                commonData.agentId = await getAgentIdForStudent(userId); // Implement this
                break;
            default:
                return messageHandler('Invalid user type', false, 400);
        }

        // Process uploaded files
        const uploadPromises = Object.entries(files).map(async ([fieldName, fileArray]) => {
            const file = fileArray[0];
            const documentType = documentTypeMap[fieldName];
            
            if (!documentType) {
                console.warn(`Unknown document type for field: ${fieldName}`);
                return null;
            }

            return documentModel.create({
                ...commonData,
                documentType,
                documentPath: file.path,
                filename: file.originalname,
                mimeType: file.mimetype
            });
        });

        const documents = (await Promise.all(uploadPromises)).filter(Boolean);
        
        return messageHandler(
            'Documents uploaded successfully',
            true,
            201,
            { documents }
        );
    } catch (error) {
        console.error('Document upload error:', error);
        return messageHandler(
            error.message || 'Failed to upload documents',
            false,
            500
        );
    }
};

// Helper function to get agent ID for a student
async function getAgentIdForStudent(studentId) {
    const student = await AgentStudent.findByPk(studentId);
    return student?.agentId;
} 
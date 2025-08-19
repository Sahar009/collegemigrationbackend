import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import { ApplicationDocument } from '../schema/applicationDocumentSchema.js';
import { messageHandler } from '../utils/index.js';
import { sendEmail } from '../utils/sendEmail.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import AgentStudent from '../schema/AgentStudentSchema.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import Application from '../schema/ApplicationSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import Wallet from '../schema/WalletSchema.js';
import Referral from '../schema/ReferralSchema.js';
import { Program } from '../schema/programSchema.js';
import AgentTransaction from '../schema/AgentTransactionSchema.js';
import sequelize from '../database/db.js';
import { Transaction } from '../schema/transactionSchema.js';

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
            sortOrder = 'DESC',
            all = false
        } = query;
        
        // If all flag is true, we'll fetch all records without pagination
        const queryLimit = all ? null : parseInt(limit);
        const queryOffset = all ? 0 : (parseInt(page) - 1) * parseInt(limit);
        
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
                limit: queryLimit,
                offset: queryOffset,
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
                limit: queryLimit,
                offset: queryOffset,
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
            
            // Only apply pagination if not fetching all records
            if (!all) {
                users = users.slice(queryOffset, queryOffset + parseInt(limit));
            }
            
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
                    totalPages: all ? 1 : Math.ceil(totalCount / parseInt(limit)),
                    currentPage: all ? 1 : parseInt(page),
                    pageSize: all ? totalCount : parseInt(limit)
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
            // For members, status should already be uppercase (validated in controller)
            user = await Member.findByPk(userId);
            if (!user) {
                return messageHandler('Member not found', false, 404);
            }
            
            await user.update({ memberStatus: status });
        } else if (userType === 'agent') {
            // For agents, status should already be lowercase (validated in controller)
            user = await Agent.findByPk(userId);
            if (!user) {
                return messageHandler('Agent not found', false, 404);
            }
            
            await user.update({ status });
        } else {
            return messageHandler('Invalid user type', false, 400);
        }
        
        // Determine the success message based on the status
        let statusMessage = 'status updated';
        if (userType === 'member') {
            statusMessage = status === 'ACTIVE' ? 'activated' : 
                          status === 'SUSPENDED' ? 'suspended' : 'set to pending';
        } else {
            statusMessage = status === 'active' ? 'activated' : 
                          status === 'inactive' ? 'deactivated' : 'set to pending';
        }
        
        return messageHandler(
            `User ${statusMessage} successfully`,
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
        

        await sendEmail({
            to: user.email,
            subject: 'Your Password Has Been Reset',
            template: 'passwordResetNotification',
            context: {
                userName: user.fullName || user.username || 'Valued User',
                tempPassword: newPassword,
                loginUrl: `${process.env.FRONTEND_URL}/${userType === 'member' ? 'login' : 'agent/login'}`
            }
        });
        
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
        // Input validation
        if (!userId || !userType) {
            return messageHandler('User ID and type are required', false, 400);
        }

        // Remove sensitive fields that shouldn't be updated this way
        const { 
            password, 
            confirmPassword, 
            newPassword, 
            currentPassword, 
            resetCode,
            resetCodeExpiry,
            regDate,
            referralCode,
            ...safeUpdateData 
        } = updateData;

        let user;
        const userModel = userType === 'member' ? Member : Agent;
        const idField = userType === 'member' ? 'memberId' : 'agentId';

        // Find user
        user = await userModel.findByPk(userId);
        if (!user) {
            return messageHandler(`${userType.charAt(0).toUpperCase() + userType.slice(1)} not found`, false, 404);
        }

        // Check for unique fields
        const uniqueFields = ['email', 'phone', 'idNumber'].filter(field => safeUpdateData[field]);
        
        for (const field of uniqueFields) {
            if (safeUpdateData[field] !== user[field]) {
                const exists = await userModel.findOne({ 
                    where: { 
                        [field]: safeUpdateData[field],
                        [idField]: { [Op.ne]: userId }
                    } 
                });
                if (exists) {
                    return messageHandler(`${field.charAt(0).toUpperCase() + field.slice(1)} already in use`, false, 400);
                }
            }
        }

        // Only proceed if there are valid fields to update
        if (Object.keys(safeUpdateData).length === 0) {
            return messageHandler('No valid fields to update', false, 400);
        }

        // Log the update for audit purposes
        console.log(`Updating ${userType} ${userId} with:`, safeUpdateData);

        // Perform the update
        await user.update(safeUpdateData);

        // Refresh the user data to get the latest values
        const updatedUser = await userModel.findByPk(userId, {
            attributes: {
                exclude: ['password', 'resetCode', 'resetCodeExpiry']
            }
        });

        return messageHandler(
            'User details updated successfully',
            true,
            200,
            updatedUser
        );

    } catch (error) {
        console.error('Update user details error:', error);
        
        // Handle specific error types
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.fields && error.fields[0];
            return messageHandler(
                `A user with this ${field || 'unique field'} already exists`,
                false,
                400
            );
        }
        
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
        
        const updatedDocument = await document.update(updatePayload);
        
        // Send email notification if status was changed
        if (newStatus !== currentStatus) {
            try {
                // Get user details based on document type
                let user;
                if (documentType.toLowerCase() === 'application') {
                    user = await Member.findByPk(document.userId, {
                        attributes: ['id', 'email', 'firstName', 'lastName']
                    });
                } else if (documentType.toLowerCase() === 'agent-student') {
                    user = await Agent.findByPk(document.agentId, {
                        attributes: ['id', 'email', 'firstName', 'lastName']
                    });
                }

                if (user && user.email) {
                    // Prepare email context
                    const emailContext = {
                        userName: `${user.firstName} ${user.lastName}`,
                        documentType: documentType === 'application' ? 'Application Document' : 'Student Document',
                        documentName: document.documentName || 'your document',
                        status: newStatus,
                        adminComment: updateData.adminComment,
                        date: new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        loginUrl: `${process.env.FRONTEND_URL || 'https://your-frontend-url.com'}/login`,
                        attachments: document.attachments ? document.attachments.map(file => ({
                            name: file.name || 'Document',
                            url: file.path ? `${process.env.BACKEND_URL || 'https://your-backend-url.com'}${file.path}` : '#',
                            size: file.size
                        })) : []
                    };

                    // Send email
                    await sendEmail({
                        to: user.email,
                        subject: `Document Status Update: ${emailContext.documentName}`,
                        template: 'documentStatusUpdate',
                        context: emailContext
                    });
                }
            } catch (emailError) {
                console.error('Failed to send status update email:', emailError);
            }
        }
        
        return messageHandler(
            'Document updated successfully',
            true,
            200,
            updatedDocument
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

/**
 * Export member or agent student details to Excel
 * @param {string} userType - 'member' or 'agent-student'
 * @param {Array} userIds - Array of user IDs to export
 * @returns {Promise<Object>} - Returns buffer and filename
 */
export const exportUserDetailsToExcel = async (userType, userIds) => {
    try {
        let users = [];
        let filename = '';
        
        if (userType === 'member') {
            // Get all member details with applications and program info
            const members = await Member.findAll({
                where: { memberId: userIds },
                include: [
                    {
                        model: Application,
                        as: 'memberApplications',
                        include: [{
                            model: Program,
                            as: 'program'
                        }]
                    }
                ]
            });

            const memberIds = members.map(member => member.memberId);

            // Get all related data in parallel
            const [applicationDocuments, wallets] = await Promise.all([
                ApplicationDocument.findAll({
                    where: { memberId: memberIds }
                }),
                Wallet.findAll({
                    where: { 
                        userId: memberIds,
                        userType: 'member'
                    }
                })
            ]);

            // Group documents by memberId
            const documentsByMember = applicationDocuments.reduce((acc, doc) => {
                if (!acc[doc.memberId]) acc[doc.memberId] = [];
                acc[doc.memberId].push(doc);
                return acc;
            }, {});

            // Group wallets by userId
            const walletByMember = wallets.reduce((acc, wallet) => {
                acc[wallet.userId] = wallet;
                return acc;
            }, {});

            // Combine all data
            users = members.map(member => {
                const memberData = member.get({ plain: true });
                const memberDocs = documentsByMember[member.memberId] || [];
                const memberWallet = walletByMember[member.memberId] || null;
                
                return {
                    type: 'Member',
                    ...memberData,
                    applications: memberData.memberApplications || [],
                    documents: memberDocs,
                    wallet: memberWallet
                };
            });
            
            filename = `members_export_${new Date().toISOString().split('T')[0]}.xlsx`;
            
        } else if (userType === 'agent-student') {
            // Get all agent student details with agent and documents
            const students = await AgentStudent.findAll({
                where: { memberId: userIds },
                include: [

                    {
                        model: AgentStudentDocument,
                        as: 'documents'
                    }
                ]
            });

            if (students.length === 0) {
                return messageHandler('No agent students found', false, 404);
            }

            const studentIds = students.map(student => student.memberId);

            // Get all agent applications with program details
            const agentApplications = await AgentApplication.findAll({
                where: { memberId: studentIds },
                include: [{
                    model: Program,
                    as: 'program',
                    attributes: ['programId', 'programName', 'schoolName', 'degree',"applicationFee" ]
                }],
                order: [['createdAt', 'DESC']]
            });

            // Group applications by memberId
            const applicationsByStudent = agentApplications.reduce((acc, app) => {
                if (!acc[app.memberId]) acc[app.memberId] = [];
                acc[app.memberId].push(app);
                return acc;
            }, {});
            
            // Combine all data
            users = students.map(student => {
                const studentData = student.get({ plain: true });
                const studentApps = applicationsByStudent[student.memberId] || [];
                
                return {
                    type: 'Agent Student',
                    ...studentData,
                    agent: studentData.agent,
                    documents: studentData.documents || [],
                    applications: studentApps
                };
            });
            
            filename = `agent_students_export_${new Date().toISOString().split('T')[0]}.xlsx`;
            
} else {
return messageHandler('Invalid user type', false, 400);
}
        
// Create Excel workbook
const workbook = new ExcelJS.Workbook();

// Helper function to style header row
const styleHeaderRow = (worksheet) => {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 0;
            if (columnLength > maxLength) maxLength = columnLength;
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });
};

if (userType === 'member') {
    // 1. Member Details Sheet
    const memberSheet = workbook.addWorksheet('Member Details');
    memberSheet.addRow([
        'Member ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Nationality',
        'Status', 'Registration Date', 'Wallet Balance', 'Total Applications', 'Total Documents'
    ]);

    // Add member data
    users.forEach(user => {
        memberSheet.addRow([
            user.memberId,
            user.firstname,
            user.lastname,
            user.email,
            user.phone,
            user.nationality,
            user.memberStatus,
            new Date(user.regDate).toLocaleDateString(),
            user.wallet ? user.wallet.balance : '0.00',
            user.applications?.length || 0,
            user.documents?.length || 0
        ]);
    });
    styleHeaderRow(memberSheet);

    // 2. Applications Sheet
    if (users.some(u => u.applications?.length > 0)) {
        const appSheet = workbook.addWorksheet('Applications');
        appSheet.addRow([
            'Application ID', 'Member ID', 'Member Name', 'Program', 'School',
            'Degree', 'Status', 'Payment Status', 'Applied Date', 'Intake'
        ]);

        users.forEach(user => {
            user.applications?.forEach(app => {
                appSheet.addRow([
                    app.applicationId,
                    user.memberId,
                    `${user.firstname} ${user.lastname}`,
                    app.program?.programName || 'N/A',
                    app.program?.schoolName || 'N/A',
                    app.program?.degree || 'N/A',
                    app.applicationStatus,
                    app.paymentStatus || 'N/A',
                    new Date(app.createdAt).toLocaleDateString(),
                    app.intake || 'N/A'
                ]);
            });
        });
        styleHeaderRow(appSheet);
    }
    
    // 3. Documents Sheet
    if (users.some(u => u.documents?.length > 0)) {
        const docSheet = workbook.addWorksheet('Documents');
        docSheet.addRow([
            'Document ID', 'Member ID', 'Member Name', 'Document Type',
            'Status', 'Document URL', 'Upload Date', 'Notes'
        ]);

        users.forEach(user => {
            user.documents?.forEach(doc => {
                // Construct document URL - adjust the path as per your storage structure
                const docUrl = doc.documentPath 
                    ? doc.documentPath
                    : 'N/A';
                
                docSheet.addRow([
                    doc.documentId,
                    user.memberId,
                    `${user.firstname} ${user.lastname}`,
                    doc.documentType || 'N/A',
                    doc.status || 'N/A',
                    { text: 'View Document', hyperlink: docUrl },
                    new Date(doc.createdAt).toLocaleDateString(),
                    doc.notes || 'N/A'
                ]);
            });
        });
        styleHeaderRow(docSheet);
    }
    
} else if (userType === 'agent-student') {
    // 1. Student Details Sheet
    const studentSheet = workbook.addWorksheet('Student Details');
    studentSheet.addRow([
        'Student ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Nationality',
        'Status', 'Registration Date', 'Agent Name', 'Agent Email',
        'Total Applications', 'Total Documents'
    ]);

    // Add student data
    users.forEach(user => {
        studentSheet.addRow([
            user.memberId,
            user.firstname,
            user.lastname,
            user.email,
            user.phone,
            user.nationality,
            user.memberStatus,
            new Date(user.regDate).toLocaleDateString(),
            user.agent ? `${user.agent.firstname} ${user.agent.lastname}` : 'N/A',
            user.agent?.email || 'N/A',
            user.applications?.length || 0,
            user.documents?.length || 0
        ]);
    });
    styleHeaderRow(studentSheet);

    // 2. Agent Applications Sheet
    if (users.some(u => u.applications?.length > 0)) {
        const appSheet = workbook.addWorksheet('Applications');
        appSheet.addRow([
            'Application ID', 'Student ID', 'Student Name', 'Program', 'School',
            'Degree', 'Status', 'Stage', 'Payment Status', 'Applied Date', 'Intake'
        ]);

        users.forEach(user => {
            user.applications?.forEach(app => {
                appSheet.addRow([
                    app.applicationId,
                    user.memberId,
                    `${user.firstname} ${user.lastname}`,
                    app.program?.programName || 'N/A',
                    app.program?.schoolName || 'N/A',
                    app.program?.degree || 'N/A',
                    app.applicationStatus,
                    app.applicationStage || 'N/A',
                    app.paymentStatus || 'N/A',
                    new Date(app.createdAt).toLocaleDateString(),
                    app.intake || 'N/A'
                ]);
            });
        });
        styleHeaderRow(appSheet);
    }
    
    // 3. Student Documents Sheet
    if (users.some(u => u.documents?.length > 0)) {
        const docSheet = workbook.addWorksheet('Documents');
        docSheet.addRow([
            'Document ID', 'Student ID', 'Student Name', 'Document Type',
            'Status', 'Document URL', 'Upload Date', 'Agent Name'
        ]);

        users.forEach(user => {
            user.documents?.forEach(doc => {
                // Construct document URL - adjust the path as per your storage structure
                const docUrl = doc.documentPath 
                    ? doc.documentPath
                    : 'N/A';
                
                docSheet.addRow([
                    doc.documentId || 'N/A',
                    user.memberId,
                    `${user.firstname} ${user.lastname}`,
                    doc.documentType || 'N/A',
                    doc.status || 'N/A',
                    { text: 'View Document', hyperlink: docUrl },
                    new Date(doc.createdAt).toLocaleDateString(),
                    user.agent ? `${user.agent.firstname} ${user.agent.lastname}` : 'N/A'
                ]);
            });
        });
        styleHeaderRow(docSheet);
    }
}
        
// Generate buffer
const buffer = await workbook.xlsx.writeBuffer();
        
return messageHandler(
'Export successful',
true,
200,
{ buffer, filename }
);
        
} catch (error) {
console.error('Export error:', error);
return messageHandler(
error.message || 'Failed to export user details',
false,
500
);
}
};

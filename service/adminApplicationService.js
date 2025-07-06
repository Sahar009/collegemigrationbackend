import Application from '../schema/ApplicationSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import AgentStudent from '../schema/AgentStudentSchema.js';
import { Program } from '../schema/programSchema.js';
import { ApplicationDocument } from '../schema/applicationDocumentSchema.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import { messageHandler } from '../utils/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { sendEmail } from '../utils/sendEmail.js';
import { createNotification } from './notificationService.js';
import ExcelJS from 'exceljs';
import { ActivityLog } from '../schema/ActivityLogSchema.js';
import Notification from '../schema/NotificationSchema.js';
import Wallet from '../schema/WalletSchema.js';
import WalletTransaction from '../schema/WalletTransactionSchema.js';
import { checkRequiredDocuments, REQUIRED_DOCUMENTS, verifyMemberProfile } from './applicationService.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import { Parser } from 'json2csv';
import { getConfig } from './appConfigService.js';


// Get all applications with filtering and pagination
export const getAllApplicationsService = async (query) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            applicationType = 'all', 
            status,
            paymentStatus,
            search,
            sortBy = 'applicationDate',
            sortOrder = 'DESC',
            startDate,
            endDate
        } = query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let directAppData = { count: 0, rows: [] };
        let agentAppData = { count: 0, rows: [] };
        
        // Build filter conditions
        const directAppWhere = {};
        const agentAppWhere = {};
        
        if (status) {
            directAppWhere.applicationStatus = status;
            agentAppWhere.applicationStatus = status;
        }
        
        if (paymentStatus) {
            directAppWhere.paymentStatus = paymentStatus;
            agentAppWhere.paymentStatus = paymentStatus;
        }
        
        // Date range filter
        if (startDate && endDate) {
            const dateFilter = {
                applicationDate: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            };
            Object.assign(directAppWhere, dateFilter);
            Object.assign(agentAppWhere, dateFilter);
        }
        
        // Get direct applications if requested
        if (applicationType === 'all' || applicationType === 'direct') {
            directAppData = await Application.findAndCountAll({
                where: directAppWhere,
                include: [
                    {
                        model: Member,
                        as: 'applicationMember',
                        attributes: ['memberId', 'firstname', 'lastname', 'email']
                    },
                    {
                        model: Program,
                        as: 'program',
                        attributes: ['programId', 'programName', 'schoolName']
                    }
                ],
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]]
            });
        }
        
        // Get agent applications if requested
        if (applicationType === 'all' || applicationType === 'agent') {
            agentAppData = await AgentApplication.findAndCountAll({
                where: agentAppWhere,
                include: [
                    {
                        model: Agent,
                        as: 'agent',
                        attributes: ['agentId', 'companyName', 'email']
                    },
                    {
                        model: AgentStudent,
                        as: 'student',
                        attributes: ['memberId', 'firstname', 'lastname', 'email']
                    },
                    {
                        model: Program,
                        as: 'program',
                        attributes: ['programId', 'programName', 'schoolName']
                    }
                ],
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]]
            });
        }
        
        // Combine and format results
        let applications = [];
        let totalCount = 0;
        
        if (applicationType === 'all') {
            // Format direct applications
            const formattedDirectApps = directAppData.rows.map(app => ({
                id: app.applicationId,
                type: 'direct',
                programName: app.program?.programName,
                schoolName: app.program?.schoolName,
                applicantName: `${app.applicationMember?.firstname} ${app.applicationMember?.lastname}`,
                applicantEmail: app.applicationMember?.email,
                status: app.applicationStatus,
                paymentStatus: app.paymentStatus,
                applicationDate: app.applicationDate,
                intake: app.intake
            }));
            
            // Format agent applications
            const formattedAgentApps = agentAppData.rows.map(app => ({
                id: app.applicationId,
                type: 'agent',
                programName: app.program?.programName,
                schoolName: app.program?.schoolName,
                applicantName: `${app.student?.firstname} ${app.student?.lastname}`,
                applicantEmail: app.student?.email,
                agentName: app.agent?.companyName,
                agentEmail: app.agent?.email,
                status: app.applicationStatus,
                paymentStatus: app.paymentStatus,
                applicationDate: app.applicationDate,
                intake: app.intake
            }));
            
            // Combine and sort
            applications = [...formattedDirectApps, ...formattedAgentApps].sort((a, b) => {
                if (sortOrder === 'DESC') {
                    return new Date(b[sortBy]) - new Date(a[sortBy]);
                }
                return new Date(a[sortBy]) - new Date(b[sortBy]);
            });
            
            // Apply pagination to combined results
            applications = applications.slice(offset, offset + parseInt(limit));
            totalCount = directAppData.count + agentAppData.count;
        } else if (applicationType === 'direct') {
            applications = directAppData.rows.map(app => ({
                id: app.applicationId,
                type: 'direct',
                programName: app.program?.programName,
                schoolName: app.program?.schoolName,
                applicantName: `${app.applicationMember?.firstname} ${app.applicationMember?.lastname}`,
                applicantEmail: app.applicationMember?.email,
                status: app.applicationStatus,
                paymentStatus: app.paymentStatus,
                applicationDate: app.applicationDate,
                intake: app.intake
            }));
            totalCount = directAppData.count;
        } else {
            applications = agentAppData.rows.map(app => ({
                id: app.applicationId,
                type: 'agent',
                programName: app.program?.programName,
                schoolName: app.program?.schoolName,
                applicantName: `${app.student?.firstname} ${app.student?.lastname}`,
                applicantEmail: app.student?.email,
                agentName: app.agent?.companyName,
                agentEmail: app.agent?.email,
                status: app.applicationStatus,
                paymentStatus: app.paymentStatus,
                applicationDate: app.applicationDate,
                intake: app.intake
            }));
            totalCount = agentAppData.count;
        }
        
        return messageHandler(
            'Applications retrieved successfully',
            true,
            200,
            {
                applications,
                pagination: {
                    totalItems: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    currentPage: parseInt(page),
                    pageSize: parseInt(limit)
                }
            }
        );
    } catch (error) {
        console.error('Get all applications error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve applications',
            false,
            500
        );
    }
};

// Get application details by ID and type
export const getApplicationDetailsService = async (applicationId, applicationType) => {
    try {
        let application;
        
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId, {
                include: [
                    {
                        model: Member,
                        as: 'applicationMember',
                        attributes: ['memberId', 'firstname', 'lastname', 'othernames', 'email', 'phone', 'gender', 'dob', 'homeAddress', 'homeCity', 'homeZipCode', 'homeState', 'homeCountry', 'nationality', 'idType', 'idNumber', 'idScanFront', 'idScanBack', 'photo', 'schengenVisaHolder', 'memberStatus', 'regDate']
                    },
                    {
                        model: Program,
                        as: 'program',
                        attributes: ['programId', 'programName', 'degree', 'degreeLevel', 'category', 'schoolName', 'language', 'semesters', 'fee', 'location', 'about', 'features', 'schoolLogo', 'programImage', 'applicationFee']
                    },
                    {
                        model: ApplicationDocument,
                        as: 'applicationDocuments',
                        attributes: ['documentId', 'memberId', 'documentType', 'documentPath', 'status', 'uploadDate']
                    }
                ]
            });
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId, {
                include: [
                    {
                        model: Agent,
                        as: 'agent',
                        attributes: { exclude: ['password'] }
                    },
                    {
                        model: AgentStudent,
                        as: 'student',
                        include: [{
                            model: AgentStudentDocument,
                            as: 'documents',
                            attributes: ['documentId', 'memberId', 'agentId', 'documentType', 'documentPath', 'status', 'uploadDate']
                        }]
                    },
                    {
                        model: Program,
                        as: 'program'
                    }
                ]
            });
        } else {
            return messageHandler(
                'Invalid application type',
                false,
                400
            );
        }
        
        if (!application) {
            return messageHandler(
                'Application not found',
                false,
                404
            );
        }
        
        return messageHandler(
            'Application details retrieved successfully',
            true,
            200,
            application
        );
    } catch (error) {
        console.error('Get application details error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve application details',
            false,
            500
        );
    }
};

// Update application status
export const updateApplicationStatusService = async (applicationId, applicationType, updateData) => {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('Updating application status:', applicationId, updateData);
        
        let application;
        let oldStatus;
        let oldPaymentStatus;
        let userId;
        let userType;
        let program;
        
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId, { 
                transaction: transaction,
                include: [{ model: Program, as: 'program' }]
            });
            
            if (!application) {
                await transaction.rollback();
                return messageHandler('Application not found', false, 404);
            }
            
            oldStatus = application.applicationStatus;
            oldPaymentStatus = application.paymentStatus;
            userId = application.memberId;
            userType = 'member';
            program = application.program;
            
            await application.update({
                applicationStatus: updateData.applicationStatus || application.applicationStatus,
                paymentStatus: updateData.paymentStatus || application.paymentStatus,
                applicationStage: updateData.applicationStage || application.applicationStage,
                applicationStatusDate: new Date()
            }, { transaction: transaction });
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId, { 
                transaction: transaction,
                include: [{ model: Program, as: 'program' }] 
            });
            
            if (!application) {
                await transaction.rollback();
                return messageHandler('Application not found', false, 404);
            }
            
            oldStatus = application.applicationStatus;
            oldPaymentStatus = application.paymentStatus;
            userId = application.memberId; // For agent apps, we refund to the student
            userType = 'member';
            program = application.program;
            
            await application.update({
                applicationStatus: updateData.applicationStatus || application.applicationStatus,
                paymentStatus: updateData.paymentStatus || application.paymentStatus,
                applicationStage: updateData.applicationStage || application.applicationStage,
                applicationStatusDate: new Date()
            }, { transaction: transaction });
        } else {
            await transaction.rollback();
            return messageHandler('Invalid application type', false, 400);
        }
        
        // Handle refunds if payment status changed to 'refunded'
        if (updateData.paymentStatus && updateData.paymentStatus === 'refunded' && oldPaymentStatus !== 'refunded') {
            // Find or create a wallet for the user
            const [wallet, created] = await Wallet.findOrCreate({
                where: { userId, userType },
                defaults: { balance: 0 },
                transaction: transaction
            });
            
            // Get application fee amount to refund
            const refundAmount = program?.applicationFee || 0;
            
            if (refundAmount > 0) {
                // Create a wallet transaction
                await WalletTransaction.create({
                    walletId: wallet.id,
                    type: 'refund',
                    amount: refundAmount,
                    status: 'Completed',
                    applicationId: applicationId
                }, { transaction: transaction });
                
                // Update wallet balance
                await wallet.update({ 
                    balance: sequelize.literal(`balance + ${refundAmount}`)
                }, { transaction: transaction });
                
                // Set status to 'cancelled' if refunding
                if (!updateData.applicationStatus) {
                    await application.update({ applicationStatus: 'cancelled' }, { transaction: transaction });
                }
            }
        }
        
        // Try to create activity log, but don't fail the transaction if it errors
        try {
            await ActivityLog.create({
                activity: `Updated application status to ${application.applicationStatus}`,
                details: JSON.stringify(updateData),
                adminId: userId,
                entityType: 'application',
                entityId: applicationId
            }, { transaction });
        } catch (logError) {
            console.warn('Failed to create activity log, continuing anyway:', logError.message);
            // Don't rethrow - we want the main transaction to continue even if logging fails
        }
        
        // Send email notification if status has changed
        if (updateData.applicationStatus && oldStatus !== updateData.applicationStatus) {
            await sendStatusUpdateEmail(application, userId, userType);
        }
        
        // Send refund notification
        if (updateData.paymentStatus === 'refunded' && oldPaymentStatus !== 'refunded') {
            await sendRefundNotification(application, userId, userType);
        }
        
        // Send notification to user about status change
        if (updateData.applicationStatus && application.applicationStatus !== updateData.applicationStatus) {
            let userId;
            let userType;
            
            if (applicationType === 'member') {
                userId = application.memberId;
                userType = 'member';
            } else if (applicationType === 'agent') {
                userId = application.agentId;
                userType = 'agent';
            }
            
            if (userId) {
                // Create status message based on application status
                let statusMessage;
                let title;
                
                switch (updateData.applicationStatus) {
                    case 'pending':
                        title = 'Application Pending';
                        statusMessage = 'Your application is pending review by our team.';
                        break;
                    case 'in_review':
                        title = 'Application In Review';
                        statusMessage = 'Your application is currently under review by our team.';
                        break;
                    case 'approved':
                        title = 'Application Approved!';
                        statusMessage = 'Congratulations! Your application has been approved.';
                        break;
                    case 'rejected':
                        title = 'Application Declined';
                        statusMessage = 'We regret to inform you that your application has been declined.';
                        break;
                    case 'on_hold':
                        title = 'Application On Hold';
                        statusMessage = 'Your application has been placed on hold. We may need additional information.';
                        break;
                    case 'submitted_to_school':
                        title = 'Application Submitted to School';
                        statusMessage = 'Your application has been submitted to the school. We will update you on their response.';
                        break;
                    case 'cancelled':
                        title = 'Application Cancelled';
                        statusMessage = 'Your application has been cancelled.';
                        break;
                    default:
                        title = 'Application Status Updated';
                        statusMessage = `Your application status has been updated to ${updateData.applicationStatus}.`;
                }
                
                // Create notification
                await Notification.create({
                    userId,
                    userType,
                    type: 'application',
                    title,
                    message: statusMessage,
                    link: `/${userType}/applications/${applicationId}`,
                    priority: 2,
                    metadata: {
                        applicationId,
                        applicationType,
                        oldStatus: application.applicationStatus,
                        newStatus: updateData.applicationStatus
                    }
                }, { transaction });
            }
        }
        
        // Send notification about refund
        if (updateData.paymentStatus === 'refunded' && oldPaymentStatus !== 'refunded') {
            let refundUserId = applicationType === 'direct' ? application.memberId : application.memberId;
            let refundUserType = applicationType === 'direct' ? 'member' : 'member';
            const refundAmount = program?.applicationFee || 0;
            
            await Notification.create({
                userId: refundUserId,
                userType: refundUserType,
                type: 'payment',
                title: 'Application Fee Refunded',
                message: `Your application fee of ${refundAmount} has been refunded to your wallet for application #${applicationId}.`,
                link: `/${refundUserType}/wallet`,
                priority: 1,
                metadata: {
                    applicationId,
                    applicationType,
                    refundAmount,
                    refundDate: new Date()
                }
            }, { transaction });
        }
        
        await transaction.commit();
        
        return messageHandler(
            'Application status updated successfully',
            true,
            200,
            application
        );
    } catch (error) {
        await transaction.rollback();
        console.error('Update application status error:', error);
        return messageHandler(
            error.message || 'Failed to update application status',
            false,
            500
        );
    }
};

// Helper function to send status update email
const sendStatusUpdateEmail = async (application, userId, userType) => {
    try {
        let user;
        let email;
        let name;
        
        // Get user details based on user type
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (user) {
                email = user.email;
                name = `${user.firstname} ${user.lastname}`;
            }
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (user) {
                email = user.email;
                name = user.contactPerson || user.companyName;
            }
        }
        
        if (!user || !email) {
            console.error('User not found or email missing for notification');
            return;
        }
        
        // Create status message based on application status
        let statusMessage;
        switch (application.applicationStatus) {
            case 'pending':
                statusMessage = 'is pending review by our team';
                break;
            case 'in_review':
                statusMessage = 'is currently under review by our team';
                break;
            case 'approved':
                statusMessage = 'has been approved! Congratulations!';
                break;
            case 'rejected':
                statusMessage = 'has been declined. We appreciate your interest.';
                break;
            case 'on_hold':
                statusMessage = 'has been placed on hold. We may need additional information.';
                break;
            case 'submitted_to_school':
                statusMessage = 'has been submitted to the school. We will update you on their response.';
                break;
            case 'cancelled':
                statusMessage = 'has been cancelled. Your application fee will be refunded.';
                break;
            default:
                statusMessage = `has been updated to ${application.applicationStatus}`;
        }
        
        // Send email notification
        await sendEmail({
            to: email,
            subject: `Application Status Update - ${application.trackingId || application.applicationId}`,
            template: 'applicationStatusUpdate',
            context: {
                name,
                trackingId: application.trackingId || application.applicationId,
                status: application.applicationStatus,
                statusMessage,
                applicationStage: application.applicationStage,
                statusDate: new Date().toLocaleDateString(),
                loginUrl: process.env.FRONTEND_URL + '/login'
            }
        });
        
        console.log(`Status update email sent to ${email} for application ${application.applicationId}`);
    } catch (error) {
        console.error('Failed to send status update email:', error);
        // Don't throw the error - we don't want to fail the status update if email fails
    }
};

// Helper function to send refund notification email
const sendRefundNotification = async (application, userId, userType) => {
    try {
        let user;
        let email;
        let name;
        
        // Get user details based on user type
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (user) {
                email = user.email;
                name = `${user.firstname} ${user.lastname}`;
            }
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (user) {
                email = user.email;
                name = user.contactPerson || user.companyName;
            }
        }
        
        if (!user || !email) {
            console.error('User not found or email missing for refund notification');
            return;
        }
        
        // Get the program information to determine refund amount
        const program = application.program;
        const refundAmount = program?.applicationFee || 0;
        
        if (refundAmount <= 0) {
            console.log('No refund amount found for application', application.applicationId);
            return;
        }
        
        // Send email notification
        await sendEmail({
            to: email,
            subject: `Application Fee Refunded - ${application.trackingId || application.applicationId}`,
            template: 'applicationStatusUpdate', // Using the status update template
            context: {
                name,
                trackingId: application.trackingId || application.applicationId,
                status: 'Application Cancelled and Refunded',
                statusMessage: `Your application has been cancelled and a refund of ${refundAmount} has been processed to your wallet. You can use this amount for future applications or request a withdrawal.`,
                applicationStage: 'Refunded',
                statusDate: new Date().toLocaleDateString(),
                loginUrl: process.env.FRONTEND_URL + '/login',
                additionalInfo: `
                    <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
                        <h3 style="color: #4CAF50;">Refund Details</h3>
                        <p><strong>Amount Refunded:</strong> ${refundAmount}</p>
                        <p><strong>Refund Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Refund Method:</strong> Wallet Credit</p>
                        <p>The refunded amount has been credited to your wallet. You can view your updated wallet balance by visiting your account.</p>
                        <a href="${process.env.FRONTEND_URL}/wallet" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">View Wallet</a>
                    </div>
                `
            }
        });
        
        console.log(`Refund notification email sent to ${email} for application ${application.applicationId}`);
    } catch (error) {
        console.error('Failed to send refund notification email:', error);
        // Don't throw the error - we don't want to fail the refund process if email fails
    }
};

// Update document status
export const updateDocumentStatusService = async (documentId, documentType, status) => {
    try {
        let document;
        
        if (documentType === 'direct') {
            document = await ApplicationDocument.findByPk(documentId);
        } else if (documentType === 'agent') {
            document = await AgentStudentDocument.findByPk(documentId);
        } else {
            return messageHandler('Invalid document type', false, 400);
        }
        
        if (!document) {
            return messageHandler('Document not found', false, 404);
        }
        
        await document.update({ status });
        
        // Send notification to user about document status change
        if (document.status !== status) {
            let userId;
            let userType;
            let applicationId;
            
            if (documentType === 'member') {
                // Get the application associated with this document
                const application = await Application.findOne({
                    where: { applicationId: document.applicationId }
                });
                
                if (application) {
                    userId = application.memberId;
                    userType = 'member';
                    applicationId = application.applicationId;
                }
            } else if (documentType === 'agent') {
                // Get the application associated with this document
                const application = await AgentApplication.findOne({
                    where: { applicationId: document.applicationId }
                });
                
                if (application) {
                    userId = application.agentId;
                    userType = 'agent';
                    applicationId = application.applicationId;
                }
            }
            
            if (userId) {
                // Create status message based on document status
                let statusMessage;
                let title;
                
                switch (status) {
                    case 'approved':
                        title = 'Document Approved';
                        statusMessage = `Your document "${document.documentType}" has been approved.`;
                        break;
                    case 'rejected':
                        title = 'Document Rejected';
                        statusMessage = `Your document "${document.documentType}" has been rejected. Please upload a new version.`;
                        break;
                    default:
                        title = 'Document Status Updated';
                        statusMessage = `Your document "${document.documentType}" status has been updated to ${status}.`;
                }
                
                // Create notification
                await Notification.create({
                    userId,
                    userType,
                    type: 'document',
                    title,
                    message: statusMessage,
                    link: `/${userType}/applications/${applicationId}/documents`,
                    priority: 1,
                    metadata: {
                        documentId,
                        documentType: document.documentType,
                        applicationId,
                        oldStatus: document.status,
                        newStatus: status
                    }
                });
            }
        }
        
        return messageHandler(
            'Document status updated successfully',
            true,
            200,
            document
        );
    } catch (error) {
        console.error('Update document status error:', error);
        return messageHandler(
            error.message || 'Failed to update document status',
            false,
            500
        );
    }
};

// Send application to school (placeholder for actual implementation)
// Helper function to send application submission email
const sendApplicationSubmissionEmail = async (application, user, program, schoolName, userType) => {
    try {
        const email = userType === 'member' ? user.email : user.contactEmail;
        const name = userType === 'member' ? `${user.firstname} ${user.lastname}` : user.contactPerson;
        
        await sendEmail({
            to: email,
            subject: `Application Submitted to ${schoolName}`,
            template: 'applicationSubmittedToSchool',
            context: {
                name,
                schoolName,
                programName: program ? program.programName : 'Selected Program',
                applicationId: application.applicationId,
                submissionDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                loginUrl: `${process.env.FRONTEND_URL || 'https://your-frontend-url.com'}/login`
            }
        });
        console.log(`Application submission email sent to ${email}`);
    } catch (error) {
        console.error('Error sending application submission email:', error);
        // Don't throw the error - we don't want to fail the main operation if email fails
    }
};

export const sendApplicationToSchoolService = async (applicationId, applicationType) => {
    try {
        let application;
        let user;
        let program;
        let schoolName = 'the selected school'; // Default fallback
        
        if (applicationType === 'direct') {
            // For direct applications
            application = await Application.findByPk(applicationId, {
                include: [
                    {
                        model: Member,
                        as: 'applicationMember',
                        attributes: ['memberId', 'firstname', 'lastname', 'email']
                    },
                    {
                        model: Program,
                        as: 'program',
                        attributes: ['programId', 'programName', 'schoolName'],
                        required: false
                    }
                ]
            });
            
            if (application) {
                user = application.applicationMember;
                program = application.program;
                if (program) {
                    schoolName = program.institutionName || schoolName;
                }
            }
        } else if (applicationType === 'agent') {
            // For agent applications
            application = await AgentApplication.findByPk(applicationId, {
                include: [
                    {
                        model: AgentStudent,
                        as: 'student',
                        attributes: ['memberId', 'firstname', 'lastname', 'email']
                    },
                    {
                        model: Program,
                        as: 'program',
                        attributes: ['programId', 'programName', 'schoolName'],
                        required: false
                    },
                    {
                        model: Agent,
                        as: 'agent',
                        attributes: ['agentId', 'contactPerson', 'email']
                    }
                ]
            });
            
            if (application) {
                user = applicationType === 'agent' ? application.agent : application.student;
                program = application.program;
                if (program) {
                    schoolName = program.institutionName || schoolName;
                }
            }
        } else {
            return messageHandler('Invalid application type', false, 400);
        }
        
        if (!application) {
            return messageHandler('Application not found', false, 404);
        }
        
        if (!user) {
            console.error('User not found for application:', applicationId);
            return messageHandler('User not found for this application', false, 404);
        }
        
    
        await application.update({
            applicationStatus: 'submitted_to_school',
            applicationStatusDate: new Date()
        });
        
        // Send email notification
        if (user) {
            await sendApplicationSubmissionEmail(
                application, 
                user, 
                program, 
                schoolName,
                applicationType === 'direct' ? 'member' : 'agent'
            );
        }
        
        return messageHandler(
            'Application sent to school successfully',
            true,
            200,
            application
        );
    } catch (error) {
        console.error('Send application to school error:', error);
        return messageHandler(
            error.message || 'Failed to send application to school',
            false,
            500
        );
    }
};

// Add these new service functions

export const exportApplicationToExcelService = async (applicationId, applicationType) => {
    try {
        let application;
        let applicantInfo;
        let programInfo;
        
        // Get application based on type
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId, {
                include: [
                    { model: Member, as: 'applicationMember' },
                    { model: Program, as: 'program' }
                ]
            });
            
            if (!application) {
                return messageHandler('Application not found', false, 404);
            }
            
            applicantInfo = application.applicationMember;
            programInfo = application.program;
            
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId, {
                include: [
                    { model: AgentStudent, as: 'student' },
                    { model: Agent, as: 'agent' },
                    { model: Program, as: 'program' }
                ]
            });
            
            if (!application) {
                return messageHandler('Application not found', false, 404);
            }
            
            applicantInfo = application.student;
            programInfo = application.program;
        } else {
            return messageHandler('Invalid application type', false, 400);
        }
        
        // Get documents for this application
        const documents = applicationType === 'direct' 
            ? await ApplicationDocument.findAll({ where: { applicationId } })
            : await AgentStudentDocument.findAll({ 
                where: { 
                    memberId: application.memberId,
                    agentId: application.agentId 
                } 
            });
        
        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Application Details');
        
        // Add application info
        worksheet.addRow(['Application Information']);
        worksheet.addRow(['Application ID', application.applicationId]);
        worksheet.addRow(['Application Date', application.createdAt]);
        worksheet.addRow(['Status', application.applicationStatus]);
        worksheet.addRow(['']);
        
        // Add applicant info
        worksheet.addRow(['Applicant Information']);
        worksheet.addRow(['Name', `${applicantInfo.firstname} ${applicantInfo.lastname}`]);
        worksheet.addRow(['Email', applicantInfo.email]);
        worksheet.addRow(['Phone', applicantInfo.phone]);
        worksheet.addRow(['Nationality', applicantInfo.nationality]);
        worksheet.addRow(['']);
        
        // Add program info
        worksheet.addRow(['Program Information']);
        worksheet.addRow(['Program Name', programInfo.programName]);
        worksheet.addRow(['School', programInfo.schoolName]);
        worksheet.addRow(['Degree', programInfo.degree]);
        worksheet.addRow(['Degree Level', programInfo.degreeLevel]);
        worksheet.addRow(['Location', programInfo.location]);
        worksheet.addRow(['']);
        
        // Add documents
        worksheet.addRow(['Documents']);
        worksheet.addRow(['Document Type', 'Filename', 'Status', 'Link']);
        
        documents.forEach(doc => {
            const documentLink = doc.documentPath;
            worksheet.addRow([
                doc.documentType, 
                doc.filename || 'No filename', 
                doc.status || 'pending',
                documentLink || 'No link available'
            ]);
            
            // Make the link clickable in Excel
            if (documentLink) {
                // Get the row that was just added
                const lastRow = worksheet.lastRow;
                // Make the link cell a hyperlink (column D is index 4)
                const linkCell = lastRow.getCell(4);
                linkCell.value = { 
                    text: 'View Document', 
                    hyperlink: documentLink.startsWith('http') ? 
                        documentLink : 
                        `${process.env.BACKEND_URL || 'http://localhost:8000'}/${documentLink}`
                };
                linkCell.font = {
                    color: { argb: '0000FF' },
                    underline: true
                };
            }
        });
        
        // Style the worksheet headers
        const headerRow = worksheet.getRow(worksheet.rowCount - documents.length - 1);
        headerRow.font = { bold: true };
        
        // Style the worksheet
        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 50;
        
        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        return messageHandler(
            'Excel file generated successfully',
            true,
            200,
            { buffer, filename: `Application_${applicationId}.xlsx` }
        );
    } catch (error) {
        console.error('Export application error:', error);
        return messageHandler(
            error.message || 'Failed to export application',
            false,
            500
        );
    }
};

export const notifyApplicantService = async (applicationId, applicationType, notificationType, message) => {
    try {
        let application;
        let applicantInfo;
        let programInfo;
        
        // Get application based on type
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId, {
                include: [
                    { model: Member, as: 'applicationMember' },
                    { model: Program, as: 'program' }
                ]
            });
            
            if (!application) {
                return messageHandler('Application not found', false, 404);
            }
            
            applicantInfo = application.applicationMember;
            programInfo = application.program;
            
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId, {
                include: [
                    { model: AgentStudent, as: 'student' },
                    { model: Agent, as: 'agent' },
                    { model: Program, as: 'program' }
                ]
            });
            
            if (!application) {
                return messageHandler('Application not found', false, 404);
            }
            
            applicantInfo = application.student;
            programInfo = application.program;
        } else {
            return messageHandler('Invalid application type', false, 400);
        }
        
        // Determine email template and subject based on notification type
        let template, subject, emailContext;
        
        switch(notificationType) {
            case 'status_update':
                template = 'applicationStatusUpdate';
                subject = `Application Status Update - ${programInfo.programName}`;
                emailContext = {
                    name: `${applicantInfo.firstname} ${applicantInfo.lastname}`,
                    programName: programInfo.programName,
                    schoolName: programInfo.schoolName,
                    applicationId: application.applicationId,
                    status: application.applicationStatus,
                    message: message || 'Your application status has been updated.',
                    loginUrl: process.env.FRONTEND_URL + '/login'
                };
                break;
                
            case 'document_request':
                template = 'applicationStatusUpdate';
                subject = `Document Request - ${programInfo.programName} Application`;
                emailContext = {
                    name: `${applicantInfo.firstname} ${applicantInfo.lastname}`,
                    programName: programInfo.programName,
                    schoolName: programInfo.schoolName,
                    applicationId: application.applicationId,
                    status: application.applicationStatus,
                    message: message || 'Please provide additional documents for your application.',
                    loginUrl: process.env.FRONTEND_URL + '/login'
                };
                break;
                
            case 'custom':
                template = 'applicationStatusUpdate';
                subject = `Update on Your ${programInfo.programName} Application`;
                emailContext = {
                    name: `${applicantInfo.firstname} ${applicantInfo.lastname}`,
                    programName: programInfo.programName,
                    schoolName: programInfo.schoolName,
                    applicationId: application.applicationId,
                    status: application.applicationStatus,
                    message: message || 'There is an update on your application.',
                    loginUrl: process.env.FRONTEND_URL + '/login'
                };
                break;
                
            default:
                return messageHandler('Invalid notification type', false, 400);
        }
        
        // Send email
        await sendEmail({
            to: applicantInfo.email,
            subject,
            template,
            context: emailContext
        });
        
        return messageHandler(
            'Notification sent successfully',
            true,
            200
        );
    } catch (error) {
        console.error('Notify applicant error:', error);
        return messageHandler(
            error.message || 'Failed to send notification',
            false,
            500
        );
    }
};

export const updateApplicationIntakeService = async (applicationId, applicationType, intake) => {
    try {
        let application;
        
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId);
            
            if (!application) {
                return messageHandler('Application not found', false, 404);
            }
            
            await application.update({ 
                intake,
                applicationStatusDate: new Date() // Update status date to track the change
            });
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId);
            
            if (!application) {
                return messageHandler('Application not found', false, 404);
            }
            
            await application.update({ 
                intake,
                applicationStatusDate: new Date() // Update status date to track the change
            });
        } else {
            return messageHandler('Invalid application type', false, 400);
        }
        
        // Create notification
        await createNotification({
            userId: applicationType === 'direct' ? application.memberId : application.agentId,
            userType: applicationType === 'direct' ? 'member' : 'agent',
            type: 'application',
            title: 'Application Intake Updated',
            message: `Your application intake has been updated to ${intake}`,
            link: `/${applicationType === 'direct' ? 'member' : 'agent'}/applications/${applicationId}`,
            priority: 1,
            metadata: {
                applicationId,
                applicationType,
                oldIntake: application.intake,
                newIntake: intake
            }
        });
        
        return messageHandler(
            'Application intake updated successfully',
            true,
            200,
            application
        );
    } catch (error) {
        console.error('Update application intake error:', error);
        return messageHandler(
            error.message || 'Failed to update application intake',
            false,
            500
        );
    }
}; 

// Export applications to CSV
export const exportApplicationsService = async (query) => {
  try {
    const { 
      status,
      programCategory,
      startDate,
      endDate,
      applicationType = 'all' // 'all', 'direct', or 'agent'
    } = query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.applicationDate = {
        [Op.between]: [
          new Date(startDate), 
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (startDate) {
      dateFilter.applicationDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      dateFilter.applicationDate = { 
        [Op.lte]: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
      };
    }
    
    // Build status filter
    const statusFilter = status ? { applicationStatus: status } : {};
    const categoryFilter = programCategory ? { programCategory } : {};
    
    // Helper function to format application data
    const formatApplication = (app, type) => {
      const baseData = {
        'Application ID': app.applicationId,
        'Application Type': type === 'agent' ? 'Agent' : 'Direct',
        'Date': new Date(app.applicationDate).toLocaleString(),
        'Status': app.applicationStatus,
        'Payment Status': app.paymentStatus,
        'Intake': app.intake || 'N/A'
      };

      if (type === 'agent') {
        return {
          ...baseData,
          'Agent ID': app.agent?.agentId || 'N/A',
          'Agent Name': app.agent?.contactPerson || 'N/A',
          'Member Name': app.AgentStudent ? 
            `${app.AgentStudent.firstName || ''} ${app.AgentStudent.lastName || ''}`.trim() : 'N/A',
          'Email': app.AgentStudent?.email || 'N/A',
          'Phone': app.AgentStudent?.phone || 'N/A',
          'Program': app.Program?.programName || 'N/A',
          'School ID': app.Program?.schoolId || 'N/A',
          'Category': app.programCategory || 'N/A'
        };
      } else {
        return {
          ...baseData,
          'Member Name': app.applicationMember ? 
            `${app.applicationMember.firstName || ''} ${app.applicationMember.lastName || ''}`.trim() : 'N/A',
          'Email': app.applicationMember?.email || 'N/A',
          'Phone': app.applicationMember?.phone || 'N/A',
          'Program': app.program?.programName || 'N/A',
          'School ID': app.program?.schoolId || 'N/A',
          'Category': app.programCategory || 'N/A'
        };
      }
    };

    // Fetch applications based on type
    const fetchDirectApplications = async () => {
      if (applicationType !== 'agent') {
        return await Application.findAll({
          where: {
            ...dateFilter,
            ...statusFilter,
            ...categoryFilter
          },
          include: [
            {
              model: Member,
              as: 'applicationMember',
              attributes: ['firstName', 'lastName', 'email', 'phone']
            },
            {
              model: Program,
              as: 'program',
              attributes: ['programName', 'schoolId']
            }
          ],
          order: [['applicationDate', 'DESC']]
        });
      }
      return [];
    };

    const fetchAgentApplications = async () => {
      if (applicationType !== 'direct') {
        return await AgentApplication.findAll({
          where: {
            ...dateFilter,
            ...statusFilter
          },
          include: [
            {
              model: Agent,
              attributes: ['agentId', 'contactPerson']
            },
            {
              model: AgentStudent,
              attributes: ['firstName', 'lastName', 'email', 'phone']
            },
            {
              model: Program,
              attributes: ['programName', 'schoolId']
            }
          ],
          order: [['applicationDate', 'DESC']]
        });
      }
      return [];
    };

    // Fetch both types of applications in parallel
    const [directApps, agentApps] = await Promise.all([
      fetchDirectApplications(),
      fetchAgentApplications()
    ]);

    // Combine and format all applications
    const allApplications = [
      ...directApps.map(app => formatApplication(app, 'direct')),
      ...agentApps.map(app => formatApplication(app, 'agent'))
    ];

    if (allApplications.length === 0) {
      return messageHandler(
        'No applications found matching the criteria',
        false,
        NOT_FOUND
      );
    }

    // Create CSV parser with all possible fields
    const fields = [
      'Application ID',
      'Application Type',
      'Date',
      'Agent ID',
      'Agent Name',
      'Member Name',
      'Email',
      'Phone',
      'Program',
      'School ID',
      'Category',
      'Status',
      'Payment Status',
      'Intake'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(allApplications);
    const filename = `applications-export-${new Date().toISOString().split('T')[0]}.csv`;

    return messageHandler(
      'Applications exported successfully',
      true,
      SUCCESS,
      {
        csvData: csv,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      }
    );

  } catch (error) {
    console.error('Export applications error:', error);
    return messageHandler(
      error.message || 'Failed to export applications',
      false,
      BAD_REQUEST
    );
  }
};

export const initiateAdminApplicationService = async (memberId, programData, callback) => {
    try {
        // Verify profile completion
        const isProfileComplete = await verifyMemberProfile(memberId);
        if (!isProfileComplete) {
            return callback(messageHandler(
                "Please complete your profile before applying", 
                false, 
                400
            ));
        }

        // Check if document validation is required from config
        const requireDocValidation = await getConfig('admin_application_document');
        if (requireDocValidation.data.admin_application_document) {
            const { isComplete, missingDocs } = await checkRequiredDocuments(memberId, programData.programCategory);
            if (!isComplete) {
                const documentDescriptions = {
                    'International Passport': 'International Passport (must be valid for at least 6 months)',
                    'Olevel Result': 'O-Level Result (WAEC, NECO, or equivalent)',
                    'Olevel Pin': 'O-Level Result Checker PIN/Scratch Card',
                    'Academic Reference Letter': 'Academic Reference Letter from your previous institution',
                    'Resume': 'Updated CV/Resume (including your work experience and education)',
                    'Language Test Cert': 'English Language Proficiency Certificate (IELTS, TOEFL, or equivalent)',
                    'Birth Certificate': 'Birth Certificate or Age Declaration',
                    'Transcript': 'Official Academic Transcript from your previous institution',
                    'Degree Certificate': 'Bachelor\'s Degree Certificate or Statement of Result',
                    'Personal Statement': 'Personal Statement/Statement of Purpose',
                    'Recommendation Letter': 'Professional or Academic Recommendation Letter'
                };

                const formattedDocs = missingDocs.map(doc => documentDescriptions[doc] || doc);

                return callback(messageHandler(
                    {
                        message: "Required Documents Missing",
                        details: {
                            title: "Please upload the following documents to proceed:",
                            missingDocuments: formattedDocs,
                            note: "All documents should be clear, legible, and in PDF or JPG format. Maximum file size: 5MB per document.",
                            totalMissing: missingDocs.length,
                            helpText: "Need help? Contact our support team for guidance on document requirements."
                        }
                    },
                    false,
                    BAD_REQUEST
                ));
            }
        }

        // Create new application
        const application = await Application.create({
            memberId,
            programId: programData.programId,
            programCategory: programData.programCategory,
            applicationStage: 1,
            paymentStatus:  programData.paymentStatus,
            applicationStatus:  programData.applicationStatus,
            intake: programData.intake,
            applicationDate: new Date()
        });

        return callback(messageHandler(
            "Application initiated successfully", 
            true, 
            SUCCESS, 
            application
        ));

    } catch (error) {
        console.error('Application initiation error:', error);
        return callback(messageHandler(
            error.message || "Error initiating application", 
            false, 
           400
        ));
    }
};


export const initiateAgentApplicationService = async (memberId, programData, agentId, callback) => {
    try {
        // Check if student exists and belongs to agent
        const student = await AgentStudent.findOne({
            where: { 
                memberId: memberId,
                agentId
            }
        });

        if (!student) {
            return callback(messageHandler(
                "Student not found or doesn't belong to agent",
                false,
                NOT_FOUND
            ));
        }

        // Check if program exists and get full program details
        const program = await Program.findOne({
            where: { programId: programData.programId },
            attributes: ['programId', 'programName', 'category', 'degree']
        });

        if (!program) {
            return callback(messageHandler(
                "Program not found",
                false,
                NOT_FOUND
            ));
        }

        // Use the category field directly since it's already an ENUM('undergraduate', 'postgraduate', 'phd')
        const programCategory = program.category;

        if (!programCategory) {
            return callback(messageHandler(
                "Unable to determine program category",
                false,
                BAD_REQUEST
            ));
        }

                const requireDocValidation = await getConfig('require_document_validation');
        
        // Check required documents
        if (requireDocValidation.data.require_document_validation) {
        const { isComplete, missingDocs } = await checkRequiredDocuments(
            memberId, 
            programCategory
        );

        if (!isComplete) {
            // Create user-friendly document descriptions
            const documentDescriptions = {
                'internationalPassport': 'International Passport (must be valid for at least 6 months)',
                'olevelResult': 'O-Level Result (WAEC, NECO, or equivalent)',
                'olevelPin': 'O-Level Result Checker PIN/Scratch Card',
                'academicReferenceLetter': 'Academic Reference Letter from previous institution',
                'resume': 'Updated CV/Resume (including work experience and education)',
                'languageTestCert': 'English Language Proficiency Certificate (IELTS, TOEFL, or equivalent)',
                'universityDegreeCertificate': 'Bachelor\'s Degree Certificate or Statement of Result',
                'universityTranscript': 'Official Academic Transcript',
                'sop': 'Statement of Purpose',
                'researchDocs': 'Research Proposal/Writing Sample'
            };

            const formattedDocs = missingDocs.map(doc => documentDescriptions[doc] || doc);
            console.log('error', formattedDocs)
            return callback(messageHandler(
                {
                    message: "Required Documents Missing",
                    details: {
                        title: "Please upload the following documents for your student to proceed:",
                        missingDocuments: formattedDocs,
                        note: "All documents should be clear, legible, and in PDF or JPG format. Maximum file size: 5MB per document.",
                        totalMissing: missingDocs.length,
                        helpText: "Need help? Contact our support team for guidance on document requirements.",
                        programCategory: programCategory // For debugging
                    }
                },
                false,
                BAD_REQUEST
            ));
        }
    }
        // Create applicatio-n with proper ENUM values
        const application = await AgentApplication.create({
            agentId,
            memberId: memberId,
            programId: programData.programId,
            programCategory: programCategory,
            applicationStage: 'documents',
            paymentStatus: programData.paymentStatus,
            applicationStatus: programData.applicationStatus,
            intake: programData.intake,
            applicationDate: new Date()
        });

        return callback(messageHandler(
            "Application created successfully",
            true,
            SUCCESS,
            application
        ));

    } catch (error) {
        console.error('Create application error:', error);
        return callback(messageHandler(
            error.message || "Error creating application",
            false,
            BAD_REQUEST
        ));
    }
};

// Enhanced export applications with comprehensive data
export const exportApplicationsComprehensiveService = async (query) => {
  try {
    console.log('=== COMPREHENSIVE APPLICATION EXPORT ===');
    console.log('Export query received:', query);
    
    const { 
      status,
      programCategory,
      startDate,
      endDate,
      applicationType = 'all', // 'all', 'direct', or 'agent'
      includeDocuments = 'true' // Whether to include document information
    } = query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.applicationDate = {
        [Op.between]: [
          new Date(startDate), 
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (startDate) {
      dateFilter.applicationDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      dateFilter.applicationDate = { 
        [Op.lte]: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
      };
    }
    
    // Build status filter
    const statusFilter = status ? { applicationStatus: status } : {};
    const categoryFilter = programCategory ? { programCategory } : {};
    
    console.log('Date filter:', dateFilter);
    console.log('Status filter:', statusFilter);
    
    // Helper function to format comprehensive application data
    const formatComprehensiveApplication = async (app, type) => {
      const baseData = {
        'Application ID': app.applicationId,
        'Application Type': type === 'agent' ? 'Agent' : 'Direct',
        'Application Date': new Date(app.applicationDate).toLocaleString(),
        'Application Status': app.applicationStatus,
        'Payment Status': app.paymentStatus,
        'Application Stage': app.applicationStage,
        'Intake': app.intake || 'N/A',
        'Application Status Date': app.applicationStatusDate ? new Date(app.applicationStatusDate).toLocaleString() : 'N/A'
      };

      let applicantData = {};
      let agentData = {};
      let programData = {};
      let documentData = {};

      if (type === 'agent') {
        // Agent application data
        applicantData = {
          'Applicant ID': app.student?.memberId || 'N/A',
          'Applicant First Name': app.student?.firstname || 'N/A',
          'Applicant Last Name': app.student?.lastname || 'N/A',
          'Applicant Email': app.student?.email || 'N/A',
          'Applicant Phone': app.student?.phone || 'N/A',
          'Applicant Nationality': app.student?.nationality || 'N/A',
          'Applicant Status': app.student?.memberStatus || 'N/A'
        };

        agentData = {
          'Agent ID': app.agent?.agentId || 'N/A',
          'Agent Company Name': app.agent?.companyName || 'N/A',
          'Agent Contact Person': app.agent?.contactPerson || 'N/A',
          'Agent Email': app.agent?.email || 'N/A',
          'Agent Phone': app.agent?.phone || 'N/A'
        };
      } else {
        // Direct application data
        applicantData = {
          'Applicant ID': app.applicationMember?.memberId || 'N/A',
          'Applicant First Name': app.applicationMember?.firstname || 'N/A',
          'Applicant Last Name': app.applicationMember?.lastname || 'N/A',
          'Applicant Other Names': app.applicationMember?.othernames || 'N/A',
          'Applicant Email': app.applicationMember?.email || 'N/A',
          'Applicant Phone': app.applicationMember?.phone || 'N/A',
          'Applicant Gender': app.applicationMember?.gender || 'N/A',
          'Applicant Date of Birth': app.applicationMember?.dob ? new Date(app.applicationMember.dob).toLocaleDateString() : 'N/A',
          'Applicant Nationality': app.applicationMember?.nationality || 'N/A',
          'Applicant ID Type': app.applicationMember?.idType || 'N/A',
          'Applicant ID Number': app.applicationMember?.idNumber || 'N/A',
          'Applicant Home Address': app.applicationMember?.homeAddress || 'N/A',
          'Applicant Home City': app.applicationMember?.homeCity || 'N/A',
          'Applicant Home State': app.applicationMember?.homeState || 'N/A',
          'Applicant Home Country': app.applicationMember?.homeCountry || 'N/A',
          'Applicant Home Zip Code': app.applicationMember?.homeZipCode || 'N/A',
          'Applicant Schengen Visa Holder': app.applicationMember?.schengenVisaHolder ? 'Yes' : 'No',
          'Applicant Status': app.applicationMember?.memberStatus || 'N/A',
          'Applicant Registration Date': app.applicationMember?.regDate ? new Date(app.applicationMember.regDate).toLocaleDateString() : 'N/A'
        };
      }

      // Program data
      programData = {
        'Program ID': app.program?.programId || 'N/A',
        'Program Name': app.program?.programName || 'N/A',
        'Program Degree': app.program?.degree || 'N/A',
        'Program Degree Level': app.program?.degreeLevel || 'N/A',
        'Program Category': app.program?.category || 'N/A',
        'School Name': app.program?.schoolName || 'N/A',
        'Program Language': app.program?.language || 'N/A',
        'Program Semesters': app.program?.semesters || 'N/A',
        'Program Fee': app.program?.fee || 'N/A',
        'Program Fee Currency': app.program?.feeCurrency || 'N/A',
        'Program Location': app.program?.location || 'N/A',
        'Program Application Fee': app.program?.applicationFee || 'N/A',
        'Program About': app.program?.about || 'N/A'
      };

      // Document data (if requested)
      if (includeDocuments === 'true') {
        let documents = [];
        
        if (type === 'agent') {
          // Get agent student documents
          documents = await AgentStudentDocument.findAll({
            where: { 
              memberId: app.memberId,
              agentId: app.agentId 
            },
            attributes: ['documentId', 'documentType', 'documentPath', 'status', 'uploadDate', 'adminComment']
          });
        } else {
          // Get application documents
          documents = await ApplicationDocument.findAll({
            where: { memberId: app.memberId },
            attributes: ['documentId', 'documentType', 'documentPath', 'status', 'uploadDate', 'adminComment']
          });
        }

        // Create document summary
        const documentTypes = documents.map(doc => doc.documentType).join('; ');
        const approvedDocs = documents.filter(doc => doc.status === 'approved').length;
        const pendingDocs = documents.filter(doc => doc.status === 'pending').length;
        const rejectedDocs = documents.filter(doc => doc.status === 'rejected').length;

        documentData = {
          'Total Documents': documents.length,
          'Document Types': documentTypes || 'N/A',
          'Approved Documents': approvedDocs,
          'Pending Documents': pendingDocs,
          'Rejected Documents': rejectedDocs,
          'Document Status Summary': `Approved: ${approvedDocs}, Pending: ${pendingDocs}, Rejected: ${rejectedDocs}`
        };

        // Add individual document details (first 5 documents)
        documents.slice(0, 5).forEach((doc, index) => {
          documentData[`Document ${index + 1} Type`] = doc.documentType;
          documentData[`Document ${index + 1} Status`] = doc.status;
          documentData[`Document ${index + 1} Upload Date`] = new Date(doc.uploadDate).toLocaleDateString();
          documentData[`Document ${index + 1} Admin Comment`] = doc.adminComment || 'N/A';
        });
      }

      return {
        ...baseData,
        ...applicantData,
        ...agentData,
        ...programData,
        ...documentData
      };
    };

    // Fetch applications based on type
    const fetchDirectApplications = async () => {
      if (applicationType !== 'agent') {
        console.log('Fetching direct applications...');
        return await Application.findAll({
          where: {
            ...dateFilter,
            ...statusFilter,
            ...categoryFilter
          },
          include: [
            {
              model: Member,
              as: 'applicationMember',
              attributes: [
                'memberId', 'firstname', 'lastname', 'othernames', 
                'email', 'phone', 'gender', 'dob', 'nationality',
                'homeAddress', 'homeCity', 'homeState', 'homeCountry',
                'homeZipCode', 'idType', 'idNumber', 'schengenVisaHolder',
                'memberStatus', 'regDate'
              ]
            },
            {
              model: Program,
              as: 'program',
              attributes: [
                'programId', 'programName', 'degree', 'degreeLevel',
                'category', 'schoolName', 'language', 'semesters',
                'fee', 'feeCurrency', 'location', 'applicationFee', 'about'
              ]
            }
          ],
          order: [['applicationDate', 'DESC']]
        });
      }
      return [];
    };

    const fetchAgentApplications = async () => {
      if (applicationType !== 'direct') {
        console.log('Fetching agent applications...');
        return await AgentApplication.findAll({
          where: {
            ...dateFilter,
            ...statusFilter
          },
          include: [
            {
              model: Agent,
              attributes: ['agentId', 'companyName', 'contactPerson', 'email', 'phone']
            },
            {
              model: AgentStudent,
              attributes: ['memberId', 'firstname', 'lastname', 'email', 'phone', 'nationality', 'memberStatus']
            },
            {
              model: Program,
              attributes: [
                'programId', 'programName', 'degree', 'degreeLevel',
                'category', 'schoolName', 'language', 'semesters',
                'fee', 'feeCurrency', 'location', 'applicationFee', 'about'
              ]
            }
          ],
          order: [['applicationDate', 'DESC']]
        });
      }
      return [];
    };

    // Fetch both types of applications in parallel
    console.log('Fetching applications...');
    const [directApps, agentApps] = await Promise.all([
      fetchDirectApplications(),
      fetchAgentApplications()
    ]);

    console.log(`Found ${directApps.length} direct applications and ${agentApps.length} agent applications`);

    // Format all applications with comprehensive data
    const allApplications = [];
    
    // Process direct applications
    for (const app of directApps) {
      const formattedApp = await formatComprehensiveApplication(app, 'direct');
      allApplications.push(formattedApp);
    }
    
    // Process agent applications
    for (const app of agentApps) {
      const formattedApp = await formatComprehensiveApplication(app, 'agent');
      allApplications.push(formattedApp);
    }

    if (allApplications.length === 0) {
      return messageHandler(
        'No applications found matching the criteria',
        false,
        NOT_FOUND
      );
    }

    console.log(`Formatted ${allApplications.length} applications for export`);

    // Create CSV with all possible fields
    const fields = [
      // Application fields
      'Application ID', 'Application Type', 'Application Date', 'Application Status',
      'Payment Status', 'Application Stage', 'Intake', 'Application Status Date',
      
      // Applicant fields
      'Applicant ID', 'Applicant First Name', 'Applicant Last Name', 'Applicant Other Names',
      'Applicant Email', 'Applicant Phone', 'Applicant Gender', 'Applicant Date of Birth',
      'Applicant Nationality', 'Applicant ID Type', 'Applicant ID Number',
      'Applicant Home Address', 'Applicant Home City', 'Applicant Home State',
      'Applicant Home Country', 'Applicant Home Zip Code', 'Applicant Schengen Visa Holder',
      'Applicant Status', 'Applicant Registration Date',
      
      // Agent fields (for agent applications)
      'Agent ID', 'Agent Company Name', 'Agent Contact Person', 'Agent Email', 'Agent Phone',
      
      // Program fields
      'Program ID', 'Program Name', 'Program Degree', 'Program Degree Level',
      'Program Category', 'School Name', 'Program Language', 'Program Semesters',
      'Program Fee', 'Program Fee Currency', 'Program Location', 'Program Application Fee',
      'Program About',
      
      // Document fields (if included)
      'Total Documents', 'Document Types', 'Approved Documents', 'Pending Documents',
      'Rejected Documents', 'Document Status Summary',
      'Document 1 Type', 'Document 1 Status', 'Document 1 Upload Date', 'Document 1 Admin Comment',
      'Document 2 Type', 'Document 2 Status', 'Document 2 Upload Date', 'Document 2 Admin Comment',
      'Document 3 Type', 'Document 3 Status', 'Document 3 Upload Date', 'Document 3 Admin Comment',
      'Document 4 Type', 'Document 4 Status', 'Document 4 Upload Date', 'Document 4 Admin Comment',
      'Document 5 Type', 'Document 5 Status', 'Document 5 Upload Date', 'Document 5 Admin Comment'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(allApplications);
    const filename = `comprehensive-applications-export-${new Date().toISOString().split('T')[0]}.csv`;

    console.log(`CSV generated successfully. Size: ${csv.length} characters`);

    return messageHandler(
      'Comprehensive applications exported successfully',
      true,
      SUCCESS,
      {
        csvData: csv,
        filename: filename,
        count: allApplications.length,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      }
    );

  } catch (error) {
    console.error('Comprehensive export applications error:', error);
    return messageHandler(
      error.message || 'Failed to export comprehensive applications',
      false,
      BAD_REQUEST
    );
  }
};








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
                        as: 'member',
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
                applicantName: `${app.member?.firstname} ${app.member?.lastname}`,
                applicantEmail: app.member?.email,
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
                applicantName: `${app.member?.firstname} ${app.member?.lastname}`,
                applicantEmail: app.member?.email,
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
                        as: 'member',
                        attributes: { exclude: ['password'] }
                    },
                    {
                        model: Program,
                        as: 'program'
                    },
                    {
                        model: ApplicationDocument,
                        as: 'applicationDocument'
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
                            as: 'documents'
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
    const t = await sequelize.transaction();
    
    try {
        let application;
        
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId, { transaction: t });
            
            if (!application) {
                await t.rollback();
                return messageHandler('Application not found', false, 404);
            }
            
            await application.update({
                applicationStatus: updateData.applicationStatus || application.applicationStatus,
                paymentStatus: updateData.paymentStatus || application.paymentStatus,
                applicationStage: updateData.applicationStage || application.applicationStage,
                applicationStatusDate: new Date()
            }, { transaction: t });
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId, { transaction: t });
            
            if (!application) {
                await t.rollback();
                return messageHandler('Application not found', false, 404);
            }
            
            await application.update({
                applicationStatus: updateData.applicationStatus || application.applicationStatus,
                paymentStatus: updateData.paymentStatus || application.paymentStatus,
                applicationStage: updateData.applicationStage || application.applicationStage,
                applicationStatusDate: new Date()
            }, { transaction: t });
        } else {
            await t.rollback();
            return messageHandler('Invalid application type', false, 400);
        }
        
        await t.commit();
        
        return messageHandler(
            'Application status updated successfully',
            true,
            200,
            application
        );
    } catch (error) {
        await t.rollback();
        console.error('Update application status error:', error);
        return messageHandler(
            error.message || 'Failed to update application status',
            false,
            500
        );
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
export const sendApplicationToSchoolService = async (applicationId, applicationType) => {
    try {
        let application;
        
        if (applicationType === 'direct') {
            application = await Application.findByPk(applicationId);
        } else if (applicationType === 'agent') {
            application = await AgentApplication.findByPk(applicationId);
        } else {
            return messageHandler('Invalid application type', false, 400);
        }
        
        if (!application) {
            return messageHandler('Application not found', false, 404);
        }
        
        // Here you would implement the actual logic to send the application to the school
        // This could involve API calls to the school's system, generating PDFs, sending emails, etc.
        
        // For now, we'll just update the status
        await application.update({
            applicationStatus: 'submitted_to_school',
            applicationStatusDate: new Date()
        });
        
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
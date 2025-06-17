import { messageHandler } from '../utils/index.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import AgentStudent from '../schema/AgentStudentSchema.js';
import { Program } from '../schema/programSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import AgentTransaction from '../schema/AgentTransactionSchema.js';
import { createNotification } from './notificationService.js';
import Wallet from '../schema/WalletSchema.js';
import { Transaction } from '../schema/transactionSchema.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import WalletTransaction from '../schema/WalletTransactionSchema.js'

// Add these helper functions at the top
const checkRequiredDocuments = async (memberId, programCategory) => {
    try {
        // Get all documents for the student
        const documents = await AgentStudentDocument.findAll({
            where: { memberId },
            attributes: ['documentType']
        });

        const uploadedDocTypes = documents.map(doc => doc.documentType);

        // Define required documents based on program category
        const requiredDocs = {
            undergraduate: [
                'internationalPassport',
                'olevelResult',
                'olevelPin',
                'academicReferenceLetter',
                'resume',
                'languageTestCert'
            ],
            postgraduate: [
                'internationalPassport',
                'olevelResult',
                'academicReferenceLetter',
                'resume',
                'universityDegreeCertificate',
                'universityTranscript',
                'sop',
                'researchDocs',
                'languageTestCert'
            ]
        };

        const docsRequired = requiredDocs[programCategory.toLowerCase()];
        if (!docsRequired) {
            throw new Error('Invalid program category');
        }

        const missingDocs = docsRequired.filter(
            docType => !uploadedDocTypes.includes(docType)
        );

        return {
            isComplete: missingDocs.length === 0,
            missingDocs
        };

    } catch (error) {
        console.error('Check required documents error:', error);
        throw error;
    }
};

// Create Application for Agent Student
export const createAgentApplicationService = async (agentId, data, callback) => {
    try {
        // Check if student exists and belongs to agent
        const student = await AgentStudent.findOne({
            where: { 
                memberId: data.memberId,
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
            where: { programId: data.programId },
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

        // Check required documents
        const { isComplete, missingDocs } = await checkRequiredDocuments(
            data.memberId, 
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

        // Create applicatio-n with proper ENUM values
        const application = await AgentApplication.create({
            agentId,
            memberId: data.memberId,
            programId: data.programId,
            programCategory: programCategory, // Using the category from program
            applicationStage: 'documents',
            paymentStatus: 'pending',
            applicationStatus: 'pending',
            intake: data.intake,
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

// Get Single Application
export const getAgentApplicationService = async (agentId, applicationId, callback) => {
    try {
        const application = await AgentApplication.findOne({
            where: { 
                applicationId,
                agentId 
            },
            include: [
                {
                    model: AgentStudent,
                    as: 'student',
                    include: [{
                        model: AgentStudentDocument,
                        as: 'documents',
                        attributes: ['documentId', 'documentType', 'documentPath', 'status']
                    }]
                },
                {
                    model: Program,
                    as: 'program'
                }
            ]
        });

        if (!application) {
            return callback(messageHandler(
                "Application not found",
                false,
                NOT_FOUND
            ));
        }

        return callback(messageHandler(
            "Application details retrieved",
            true,
            SUCCESS,
            application
        ));

    } catch (error) {
        console.error('Get application error:', error);
        return callback(messageHandler(
            "Error retrieving application details",
            false,
            BAD_REQUEST
        ));
    }
};

// Get All Applications for Agent
export const getAllAgentApplicationsService = async (agentId, query) => {
    try {
        // Set default values for pagination
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        
        if (page < 1 || limit < 1) {
            return messageHandler(
                "Invalid pagination parameters",
                false,
                400
            );
        }

        const offset = (page - 1) * limit;
        
        const { count, rows: applications } = await AgentApplication.findAndCountAll({
            where: { agentId },
            include: [
                {
                    model: AgentStudent,
                    as: 'student',
                    attributes: [
                        'memberId', 'firstname', 'lastname', 'email',
                        'phone', 'nationality', 'memberStatus'
                    ]
                },
                {
                    model: Program,
                    as: 'program',
                    attributes: [
                        'programId', 'programName', 'degree',
                        'schoolName', 'fee', 'applicationFee'
                    ]
                },
                {
                    model: AgentTransaction,
                    as: 'transactions',
                    attributes: ['transactionId', 'amount', 'currency', 'status', 'paymentReference'],
                    limit: 1,
                    order: [['createdAt', 'DESC']]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        return messageHandler(
            "Applications retrieved successfully",
            true,
            200,
            {
                data: applications,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    pageSize: limit,
                    hasNextPage: page * limit < count,
                    hasPreviousPage: page > 1
                }
            }
        );

    } catch (error) {
        console.error('Get all applications error:', error);
        return messageHandler(
            "Error retrieving applications",
            false,
            500
        );
    }
};

// Update Application Status
export const updateAgentApplicationService = async (agentId, applicationId, data, callback) => {
    try {
        const application = await AgentApplication.findOne({
            where: { 
                applicationId,
                agentId 
            }
        });

        if (!application) {
            return callback(messageHandler(
                "Application not found",
                false,
                NOT_FOUND
            ));
        }

        await application.update({
            applicationStage: data.applicationStage || application.applicationStage,
            applicationStatus: data.applicationStatus || application.applicationStatus,
            paymentStatus: data.paymentStatus || application.paymentStatus,
            intake: data.intake || application.intake,
            applicationStatusDate: new Date()
        });

        return callback(messageHandler(
            "Application updated successfully",
            true,
            SUCCESS,
            application
        ));

    } catch (error) {
        console.error('Update application error:', error);
        return callback(messageHandler(
            "Error updating application",
            false,
            BAD_REQUEST
        ));
    }
};

const getApplicationPaymentAmount = async (applicationId) => {
    const transaction = await AgentTransaction.findOne({
        where: { 
            applicationId,
            status: 'completed' // Only consider completed transactions
        },
        order: [['createdAt', 'DESC']]
    });
    return transaction ? transaction.amount : 0;
};

// Delete Application (Soft Delete)
export const deleteAgentApplicationService = async (agentId, applicationId, callback) => {
    const t = await sequelize.transaction();
    try {
        const application = await AgentApplication.findOne({
            where: { 
                applicationId,
                agentId 
            },
            transaction: t
        });

        if (!application) {
            await t.rollback();
            return callback(messageHandler(
                "Application not found",
                false,
                NOT_FOUND
            ));
        }

        // Check if application can be cancelled
        if (application.applicationStatus === 'submitted_to_school') {
            await t.rollback();
            return callback(messageHandler(
                "Cannot cancel application already submitted to school",
                false,
                BAD_REQUEST
            ));
        }

        // Check if payment was made and needs refund
        if (application.paymentStatus === 'paid') {
            console.log(agentId, applicationId)
            const wallet = await Wallet.findOne({
                where: {
                    userId: agentId,
                    userType: 'agent'
                },
                transaction: t
            });

            if (!wallet) {
                await t.rollback();
                return callback(messageHandler(
                    "Wallet not found",
                    false,
                    NOT_FOUND
                ));
            }

            // Get payment amount - ensure this function is implemented
            const paymentAmount = await getApplicationPaymentAmount(applicationId);
            console.log(paymentAmount)
            // Refund to wallet
            await wallet.update({
                balance: sequelize.literal(`balance + ${paymentAmount}`)
            }, { transaction: t });

            // Create AgentTransaction
            await AgentTransaction.create({
                transactionId: `RFND-${Date.now()}-${applicationId}`,
                agentId,
                applicationId,
                memberId: application.memberId,
                amount: paymentAmount,
                currency: 'USD',
                amountInUSD: paymentAmount,
                paymentMethod: 'wallet_refund',
                paymentProvider: 'system',
                status: 'completed',
                paymentReference: `REFUND-${Date.now()}`,
                metadata: {
                    originalApplicationStatus: application.applicationStatus,
                    refundReason: 'application_cancellation'
                }
            }, { transaction: t });

            // Create WalletTransaction
            await WalletTransaction.create({
                walletId: wallet.walletId,
                type: 'refund',
                amount: paymentAmount,
                status: 'Completed',
                applicationId
            }, { transaction: t });
        }

        // Update application status
        await application.update({
            applicationStatus: 'cancelled',
            applicationStatusDate: new Date(),
            paymentStatus: application.paymentStatus === 'paid' ? 'refunded' : application.paymentStatus,
            cancellationReason: 'agent_request' // Add cancellation reason
        }, { transaction: t });

        await createNotification({
            userId: agentId,
            userType: 'agent',
            type: 'application_status',
            title: 'Application Cancelled',
            message: `Your application #${applicationId} has been cancelled.`,
            link: `/agent/applications/${applicationId}`
        });

        await t.commit();
        
        return callback(messageHandler(
            "Application cancelled successfully",
            true,
            SUCCESS
        ));

    } catch (error) {
        await t.rollback();
        console.error('Delete application error:', error);
        return callback(messageHandler(
            "Error cancelling application",
            false,
            BAD_REQUEST
        ));
    }
};
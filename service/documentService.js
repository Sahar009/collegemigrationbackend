import AgentApplication from '../schema/AgentApplicationSchema.js';
import ApplicationDocument from '../schema/applicationDocumentSchema.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import Notification from '../schema/NotificationSchema.js';
import { messageHandler } from '../utils/index.js';
import fs from 'fs';
import path from 'path';

// Valid document types for member uploads
const VALID_DOCUMENT_TYPES = [
    'internationalPassport',
    'olevelResult',
    'olevelPin',
    'academicReferenceLetter',
    'resume',
    'universityDegreeCertificate',
    'universityTranscript',
    'sop',
    'researchDocs',
    'languageTestCert',
    'photo',
    'idScanFront',
    'idScanBack'
];

/**
 * Add a new document for a member
 * @param {number} memberId - ID of the member
 * @param {string} documentType - Type of the document (must be one of VALID_DOCUMENT_TYPES)
 * @param {string} documentPath - Path where the document is stored
 * @param {number} [agentId] - Optional agent ID if uploaded by an agent
 * @returns {Promise<Object>} - Result of the operation
 */
export const addMemberDocument = async (memberId, documentType, documentPath, agentId = null) => {
    try {
        // Validate document type
        if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
            return messageHandler('Invalid document type', false, 400);
        }

        // Check if document already exists for this member
        const existingDoc = await ApplicationDocument.findOne({
            where: {
                memberId,
                documentType,
                // status: 'approved' // Only check approved documents
            }
        });

        if (existingDoc) {
            // If document exists, we can either update it or return an error
            // For now, we'll update the existing document
            await existingDoc.update({
                documentPath,
                status: 'pending',
                adminComment: null,
                reviewedBy: null,
                reviewedAt: null
            });
            return messageHandler('Document updated successfully', true, 200, { documentId: existingDoc.documentId });
        }

        // Create new document record
        const newDocument = await ApplicationDocument.create({
            memberId,
            agentId,
            documentType,
            documentPath,
            status: 'pending',
            uploadDate: new Date()
        });

        return messageHandler('Document uploaded successfully', true, 201, { documentId: newDocument.documentId });
    } catch (error) {
        console.error('Error adding member document:', error);
        return messageHandler(
            error.message || 'Failed to add document',
            false,
            500
        );
    }
};

export const updateDocumentPathService = async (documentId, documentType, newPath, userId) => {
    try {
        let document;
        
        // Find the document based on type
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
        
        // Store old path for cleanup
        const oldPath = document.documentPath;
        
        // Update document path
        await document.update({
            documentPath: newPath,
            status: 'pending', // Reset status to pending when path is updated
            adminComment: null, // Clear any previous admin comments
            reviewedBy: null,
            reviewedAt: null
        });
        
        // Get application for notification
        let application;
        let userType;
        
        if (documentType === 'direct') {
            application = await AgentApplication.findOne({
                where: { applicationId: document.applicationId }
            });
            userType = 'member';
        } else {
            application = await AgentApplication.findOne({
                where: { applicationId: document.applicationId }
            });
            userType = 'agent';
        }
        
        if (application) {
            // Create notification
            await Notification.create({
                userId: userId,
                userType: userType,
                type: 'document',
                title: 'Document Updated',
                message: `A new version of your "${document.documentType}" document has been uploaded.`,
                link: `/${userType}/applications/${application.applicationId}/documents`,
                priority: 2,
                metadata: {
                    documentId: document.documentId,
                    documentType: document.documentType,
                    applicationId: application.applicationId,
                    action: 'document_updated'
                }
            });
        }
        
        // Clean up old file if it exists
        if (oldPath && oldPath !== newPath) {
            try {
                const fullPath = path.join(process.cwd(), 'uploads', oldPath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (error) {
                console.error('Error cleaning up old document:', error);
                // Don't fail the request if cleanup fails
            }
        }
        
        return messageHandler(
            'Document updated successfully',
            true,
            200,
            document
        );
    } catch (error) {
        console.error('Update document path error:', error);
        return messageHandler(
            error.message || 'Failed to update document path',
            false,
            500
        );
    }
};

export const getDocumentService = async (documentId, documentType) => {
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
        
        return messageHandler(
            'Document retrieved successfully',
            true,
            200,
            document
        );
    } catch (error) {
        console.error('Get document error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve document',
            false,
            500
        );
    }
};

// Document path update service removed as it was a duplicate

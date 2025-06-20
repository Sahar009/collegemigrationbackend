import AgentApplication from '../schema/AgentApplicationSchema.js';
import ApplicationDocument from '../schema/applicationDocumentSchema.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import Notification from '../schema/NotificationSchema.js';
import { messageHandler } from '../utils/index.js';
import fs from 'fs';
import path from 'path';

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

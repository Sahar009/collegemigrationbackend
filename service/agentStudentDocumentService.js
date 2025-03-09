import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';
import AgentStudentDocument from '../schema/AgentStudentDocumentSchema.js';
import { validateDocuments } from '../utils/documentValidator.js';

// Submit multiple documents
export const submitStudentDocumentsService = async (memberId, agentId, programType, files, callback) => {
    try {
        // Validate required documents
        const { isValid, missingDocs } = validateDocuments(files, programType);
        
        if (!isValid) {
            return callback(messageHandler(
                "Missing required documents: " + missingDocs.join(', '), 
                false, 
                BAD_REQUEST
            ));
        }

        // Create document records
        const documentPromises = Object.entries(files).map(([docType, file]) => {
            return AgentStudentDocument.create({
                memberId,
                agentId,
                documentType: docType,
                documentPath: file.path,
                status: 'pending',
                uploadDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        const studentDocs = await Promise.all(documentPromises);

        return callback(messageHandler(
            "Documents uploaded successfully", 
            true, 
            SUCCESS, 
            studentDocs
        ));

    } catch (error) {
        console.error('Student documents submission error:', error);
        return callback(messageHandler(
            error.message || "Error submitting documents", 
            false, 
            BAD_REQUEST
        ));
    }
};

// Get student documents
export const getStudentDocumentsService = async (memberId, agentId, callback) => {
    try {
        const documents = await AgentStudentDocument.findAll({
            where: { 
                memberId,
                agentId 
            },
            order: [['uploadDate', 'DESC']],
            attributes: [
                'documentId',
                'memberId',
                'agentId',
                'documentType',
                'documentPath',
                'uploadDate',
                'status'
            ]
        });

        if (!documents || documents.length === 0) {
            return callback(messageHandler(
                "No documents found for this student",
                false,
                BAD_REQUEST
            ));
        }

        return callback(messageHandler(
            "Documents retrieved successfully",
            true,
            SUCCESS,
            documents
        ));
    } catch (error) {
        console.error('Get student documents error:', error);
        return callback(messageHandler(
            "Error retrieving documents",
            false,
            BAD_REQUEST
        ));
    }
};

// Update single document
export const updateStudentDocumentService = async (memberId, updateData, callback) => {
    try {
        // Find existing document
        let document = await AgentStudentDocument.findOne({
            where: {
                memberId,
                agentId: updateData.agentId,
                documentType: updateData.documentType
            }
        });

        if (document) {
            // Update existing document
            await document.update({
                documentPath: updateData.documentPath,
                status: 'pending',
                uploadDate: new Date(),
                updatedAt: new Date()
            });
        } else {
            // Create new document
            document = await AgentStudentDocument.create({
                memberId: updateData.memberId,
                agentId: updateData.agentId,
                documentType: updateData.documentType,
                documentPath: updateData.documentPath,
                status: 'pending',
                uploadDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        return callback(messageHandler(
            `${updateData.documentType} ${document ? 'updated' : 'uploaded'} successfully`,
            true,
            SUCCESS,
            document
        ));

    } catch (error) {
        console.error('Update student document error:', error);
        return callback(messageHandler(
            error.message || "Error updating document",
            false,
            BAD_REQUEST
        ));
    }
};

// Upload single document
export const uploadSingleStudentDocumentService = async (memberId, agentId, documentType, file, callback) => {
    try {
        if (!file) {
            return callback(messageHandler(
                "No file provided", 
                false, 
                BAD_REQUEST
            ));
        }

        // Check for existing document
        let document = await AgentStudentDocument.findOne({
            where: {
                memberId,
                agentId,
                documentType
            },
            attributes: [
                'documentId',
                'memberId',
                'agentId',
                'documentType',
                'documentPath',
                'status',
                'uploadDate',
                'createdAt',
                'updatedAt'
            ]
        });

        if (document) {
            // Update existing document
            document = await document.update({
                documentPath: file.path,
                status: 'pending',
                uploadDate: new Date(),
                updatedAt: new Date()
            });
        } else {
            // Create new document
            document = await AgentStudentDocument.create({
                memberId,
                agentId,
                documentType,
                documentPath: file.path,
                status: 'pending',
                uploadDate: new Date()
            });
        }

        return callback(messageHandler(
            `${documentType} ${document ? 'updated' : 'uploaded'} successfully`,
            true,
            SUCCESS,
            document
        ));

    } catch (error) {
        console.error('Student document upload error:', error);
        return callback(messageHandler(
            error.message || "Error uploading document",
            false,
            BAD_REQUEST
        ));
    }
}; 
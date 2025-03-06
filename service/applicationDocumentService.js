import { validateDocuments } from '../utils/documentValidator.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';
import ApplicationDocument from '../schema/applicationDocumentSchema.js';

export const submitApplicationService = async (memberId, programType, files, callback) => {
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
            return ApplicationDocument.create({
                memberId,
                documentType: docType,  // Set the document type from the file key
                documentPath: file.path, // Assuming multer/cloudinary sets the path
                status: 'pending',
                uploadDate: new Date()
            });
        });

        const applicationDocs = await Promise.all(documentPromises);

        return callback(messageHandler(
            "Documents uploaded successfully", 
            true, 
            SUCCESS, 
            applicationDocs
        ));

    } catch (error) {
        console.error('Application submission error:', error);
        return callback(messageHandler(
            error.message || "Error submitting application", 
            false, 
            BAD_REQUEST
        ));
    }
};


export const getApplicationDocuments = async (memberId, callback) => {
    try {
        const documents = await ApplicationDocument.findAll({  // Changed from findOne to findAll
            where: { memberId },
            order: [['uploadDate', 'DESC']], // Optional: order by upload date, newest first
            attributes: [
                'documentId',
                'memberId',
                'documentType',
                'documentPath',
                'uploadDate',
                'status'
            ]
        });

        if (!documents || documents.length === 0) {
            return callback(messageHandler(
                "No documents found for this member",
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
        console.error('Get documents error:', error);
        return callback(messageHandler(
            "Error retrieving documents",
            false,
            BAD_REQUEST
        ));
    }
};

export const updateApplicationDocumentService = async (documentId, updateData, callback) => {
    try {
        // Find the document
        let document = await ApplicationDocument.findByPk(documentId);
        
        if (!document) {
            // Validate required fields
            if (!updateData.memberId) {
                return callback(messageHandler(
                    "memberId is required",
                    false,
                    BAD_REQUEST
                ));
            }

            if (!updateData.documentPath) {
                return callback(messageHandler(
                    "File upload is required",
                    false,
                    BAD_REQUEST
                ));
            }

            // Create new document if it doesn't exist
            document = await ApplicationDocument.create({
                id: documentId,
                memberId: updateData.memberId,
                documentPath: updateData.documentPath,
                documentType: updateData.documentType,
                ...updateData,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return callback(messageHandler(
                "Document uploaded successfully",
                true,
                SUCCESS,
                document
            ));
        }

        // Update the document with the new data
        await document.update({
            ...updateData,
            updatedAt: new Date()
        });

        // Fetch the updated document
        const updatedDocument = await ApplicationDocument.findByPk(documentId);

        return callback(messageHandler(
            "Document updated successfully",
            true,
            SUCCESS,
            updatedDocument
        ));

    } catch (error) {
        console.error('Update document error:', error);
        return callback(messageHandler(
            error.message || "Error updating document",
            false,
            BAD_REQUEST
        ));
    }
};

export const uploadSingleDocumentService = async (memberId, documentType, file, callback) => {
    try {
        if (!file) {
            return callback(messageHandler(
                "No file provided", 
                false, 
                BAD_REQUEST
            ));
        }

        // First try to find the existing document
        let document = await ApplicationDocument.findOne({
            where: {
                memberId,
                documentType
            }
        });

        if (document) {
            // Document exists, update it
            document = await document.update({
                documentPath: file.path,
                status: 'pending',
                uploadDate: new Date(),
                updatedAt: new Date()
            });

            return callback(messageHandler(
                `${documentType} updated successfully`,
                true,
                SUCCESS,
                document
            ));
        } else {
            // Document doesn't exist, create new one
            document = await ApplicationDocument.create({
                memberId,
                documentType,
                documentPath: file.path,
                status: 'pending',
                uploadDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return callback(messageHandler(
                `${documentType} uploaded successfully`,
                true,
                SUCCESS,
                document
            ));
        }

    } catch (error) {
        console.error('Document upload error:', error);
        return callback(messageHandler(
            error.message || "Error uploading document",
            false,
            BAD_REQUEST
        ));
    }
};
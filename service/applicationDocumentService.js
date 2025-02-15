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
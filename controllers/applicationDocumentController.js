import { submitApplicationService, getApplicationDocuments, updateApplicationDocumentService, uploadSingleDocumentService } from '../service/applicationDocumentService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

export const submitApplicationDocuments = async (req, res) => {
    try {
        const memberId = req.user.id;
        const { programType } = req.body;
        const files = req.files; // Multer provides this
        console.log(files)

        // Basic validation
        if (!programType || !['undergraduate', 'postgraduate'].includes(programType.toLowerCase())) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Invalid program type. Must be 'undergraduate' or 'postgraduate'", false, BAD_REQUEST)
            );
        }

        if (!files || Object.keys(files).length === 0) {
            return res.status(BAD_REQUEST).json(
                messageHandler("No files were uploaded", false, BAD_REQUEST)
            );
        }

        // Convert multer files to a simpler object with paths
        const documentFiles = {};
        for (const key in files) {
            if (files[key] && files[key][0]) {
                documentFiles[key] = files[key][0];
            }
        }

        await submitApplicationService(memberId, programType, documentFiles, (response) => {
            res.status(response.statusCode).json(response);
        });

    } catch (error) {
        console.error('Submit application controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error processing application", false, BAD_REQUEST)
        );
    }
};

export const getApplicationDocumentsByMember = async (req, res) => {
    try {
        const memberId = req.user.id;
        await getApplicationDocuments(memberId, (response) => {
            res.status(response.statusCode).json(response);
        });
    } catch (error) {
        console.error('Get documents controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler("Error retrieving documents", false, BAD_REQUEST)
        );
    }
}; 

export const updateApplicationDocument = async (req, res) => {
    try {
        const { documentType } = req.params;
        const updateData = {
            ...req.body,
            documentType // Add documentType from params
        };

        // Generate a unique documentId if not provided
        const documentId = req.params.documentId || Date.now().toString();

        // If a file was uploaded, add the path to updateData
        if (req.file) {
            updateData.documentPath = req.file.path; // Changed from documentUrl to documentPath
        }

        await updateApplicationDocumentService(
            documentId,
            updateData,
            (response) => {
                return res.status(response.statusCode).json({
                    success: response.success,
                    message: response.message,
                    data: response.data
                });
            }
        );
    } catch (error) {
        console.error('Update document controller error:', error);
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message || 'Error updating document'
        });
    }
};

export const uploadSingleDocument = async (req, res) => {
    try {
        const memberId = req.user.id;
        const { documentType } = req.params;
        const file = req.file;

        await uploadSingleDocumentService(
            memberId,
            documentType,
            file,
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error uploading document", false, BAD_REQUEST)
        );
    }
};

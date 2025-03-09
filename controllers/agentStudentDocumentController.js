import {
    submitStudentDocumentsService,
    getStudentDocumentsService,
    updateStudentDocumentService,
    uploadSingleStudentDocumentService
} from '../service/agentStudentDocumentService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

// Submit multiple documents
export const submitStudentDocuments = async (req, res) => {
    try {
        const { memberId, programType } = req.body;
        const agentId = req.agent.id; // Get agent ID from authenticated session
        const files = req.files;

        if (!memberId || !programType) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Member ID and program type are required", false, BAD_REQUEST)
            );
        }

        if (!files || Object.keys(files).length === 0) {
            return res.status(BAD_REQUEST).json(
                messageHandler("No files were uploaded", false, BAD_REQUEST)
            );
        }

        await submitStudentDocumentsService(
            memberId,
            agentId,
            programType,
            files,
            (result) => {
                const statusCode = result.success ? 200 : 400;
                res.status(statusCode).json(result);
            }
        );
    } catch (error) {
        console.error('Submit documents controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error processing documents", false, BAD_REQUEST)
        );
    }
};

// Get student documents
export const getStudentDocuments = async (req, res) => {
    try {
        const { memberId } = req.params;
        const agentId = req.agent.id;

        if (!memberId) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Member ID is required", false, BAD_REQUEST)
            );
        }

        await getStudentDocumentsService(
            memberId,
            agentId,
            (result) => {
                const statusCode = result.success ? 200 : 400;
                res.status(statusCode).json(result);
            }
        );
    } catch (error) {
        console.error('Get documents controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler("Error retrieving documents", false, BAD_REQUEST)
        );
    }
};

// Update document
export const updateStudentDocument = async (req, res) => {
    try {
        const { memberId, documentType } = req.params;
        const agentId = req.agent?.id || req.user?.id;  // Check both locations

        // Debug log
        console.log('Document update request:', {
            memberId,
            documentType,
            agentId,
            hasFile: !!req.file,
            agent: req.agent,
            user: req.user
        });

        if (!agentId) {
            return res.status(401).json(
                messageHandler(
                    "Authentication required",
                    false,
                    401
                )
            );
        }

        if (!req.file) {
            return res.status(400).json(
                messageHandler(
                    "No file provided",
                    false,
                    400
                )
            );
        }

        await uploadSingleStudentDocumentService(
            memberId,
            agentId,
            documentType,
            req.file,
            (response) => {
                res.status(response.statusCode).json(response);
            }
        );

    } catch (error) {
        console.error('Update student document error:', error);
        console.error('Request details:', {
            params: req.params,
            agent: req.agent,
            user: req.user,
            file: req.file ? 'Present' : 'Missing'
        });
        return res.status(400).json(
            messageHandler(
                error.message || "Error updating document",
                false,
                400
            )
        );
    }
};

// Upload single document
export const uploadSingleStudentDocument = async (req, res) => {
    try {
        const { memberId, documentType } = req.body;
        const agentId = req.agent.id;
        const file = req.file;

        if (!memberId || !documentType) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Member ID and document type are required", false, BAD_REQUEST)
            );
        }

        if (!file) {
            return res.status(BAD_REQUEST).json(
                messageHandler("No file was uploaded", false, BAD_REQUEST)
            );
        }

        await uploadSingleStudentDocumentService(
            memberId,
            agentId,
            documentType,
            file,
            (result) => {
                const statusCode = result.success ? 200 : 400;
                res.status(statusCode).json(result);
            }
        );
    } catch (error) {
        console.error('Upload document controller error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error uploading document", false, BAD_REQUEST)
        );
    }
};

// Get document status
export const getDocumentStatus = async (req, res) => {
    try {
        const { memberId, documentType } = req.params;
        const agentId = req.agent.id;

        await getStudentDocumentsService(
            memberId,
            agentId,
            (result) => {
                if (!result.success) {
                    return res.status(400).json(result);
                }

                // Filter for specific document type if provided
                if (documentType) {
                    const filteredDocs = result.data.filter(
                        doc => doc.documentType === documentType
                    );
                    result.data = filteredDocs;
                }

                res.status(200).json(result);
            }
        );
    } catch (error) {
        console.error('Get document status error:', error);
        res.status(BAD_REQUEST).json(
            messageHandler("Error getting document status", false, BAD_REQUEST)
        );
    }
}; 
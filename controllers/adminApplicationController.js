import * as adminApplicationService from '../service/adminApplicationService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';
import ExcelJS from 'exceljs';

// Get all applications
export const getAllApplications = async (req, res) => {
    try {
        const result = await adminApplicationService.getAllApplicationsService(req.query);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Get application details
export const getApplicationDetails = async (req, res) => {
    try {
        const { applicationId, applicationType } = req.params;
        
        if (!applicationId || !applicationType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminApplicationService.getApplicationDetailsService(applicationId, applicationType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId, applicationType } = req.params;
        const updateData = req.body;
        
        if (!applicationId || !applicationType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Update data is required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminApplicationService.updateApplicationStatusService(
            applicationId, 
            applicationType, 
            updateData
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Update document status
export const updateDocumentStatus = async (req, res) => {
    try {
        const { documentId, documentType } = req.params;
        const { status } = req.body;
        
        if (!documentId || !documentType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Document ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Valid status (pending/approved/rejected) is required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminApplicationService.updateDocumentStatusService(
            documentId,
            documentType,
            status
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Send application to school
export const sendApplicationToSchool = async (req, res) => {
    try {
        const { applicationId, applicationType } = req.params;
        
        if (!applicationId || !applicationType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminApplicationService.sendApplicationToSchoolService(
            applicationId,
            applicationType
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

export const exportApplicationToExcel = async (req, res) => {
    try {
        const { id: applicationId } = req.params;
        const { applicationType } = req.query;
        
        const result = await adminApplicationService.exportApplicationToExcelService(applicationId, applicationType);
        
        if (!result.success) {
            return res.status(result.statusCode).json(result);
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
        
        // Send buffer
        return res.send(Buffer.from(result.data.buffer));
    } catch (error) {
        console.error('Export to Excel error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to export application to Excel'
        });
    }
};

export const notifyApplicant = async (req, res) => {
    try {
        const { id: applicationId } = req.params;
        const { applicationType, notificationType, message } = req.body;
        
        const result = await adminApplicationService.notifyApplicantService(
            applicationId, 
            applicationType, 
            notificationType, 
            message
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Notification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send notification'
        });
    }
};

export const updateApplicationIntake = async (req, res) => {
    try {
        const { id: applicationId } = req.params;
        const { applicationType, intake } = req.body;
        
        if (!applicationId || !applicationType || !intake) {
            return res.status(400).json({
                success: false,
                message: 'Application ID, type, and intake are required',
                statusCode: 400
            });
        }
        
        const result = await adminApplicationService.updateApplicationIntakeService(
            applicationId,
            applicationType,
            intake
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Update intake error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update intake',
            statusCode: 500
        });
    }
}; 
import { 
    updateMemberProfileService, 
    getOnboardingStatusService,
    validateIdDocumentsService,
    updateOnboardingSectionService, 
    getMemberProfileService,
    uploadDocumentsService,
    updateProfileFieldsService
} from '../service/onboardingService.js';

export const updateMemberProfile = (req, res) => {
    const memberId = req.user.id;
    const profileData = { ...req.body };
    
    // Handle files the same way as uploadDocuments
    if (req.files) {
        if (req.files.photo) {
            profileData.photo = req.files.photo[0].path;
        }
        if (req.files.idScanFront) {
            profileData.idScanFront = req.files.idScanFront[0].path;
        }
        // if (req.files.idScanBack) {
        //     profileData.idScanBack = req.files.idScanBack[0].path;
        // }
    }

    updateMemberProfileService(memberId, profileData, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const getOnboardingStatus = (req, res) => {
    const memberId = req.user.id;

    getOnboardingStatusService(memberId, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const validateIdDocuments = (req, res) => {
    const memberId = req.user.id;

    validateIdDocumentsService(memberId, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const updateOnboardingSection = (req, res) => {
    const memberId = req.user.id;
    const { section } = req.params;
    const sectionData = req.body;

    updateOnboardingSectionService(memberId, section, sectionData, (response) => {
        res.status(response.statusCode).json(response);
    });
};

// Dedicated document upload endpoint
export const uploadDocuments = async (req, res) => {
    const memberId = req.user.id;
    const files = req.files;
console.log(files)
    // Validate if files were provided
    if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
            status: false,
            message: "No files were uploaded"
        });
    }

    uploadDocumentsService(memberId, files, (response) => {
        res.status(response.statusCode).json(response);
    });
};

// Get member profile details
export const getMemberProfile = (req, res) => {
    const memberId = req.user.id;

    getMemberProfileService(memberId, (response) => {
        res.status(response.statusCode).json(response);
    });
};

// Update specific profile fields
export const updateProfileFields = (req, res) => {
    const memberId = req.user.id;
    const updates = req.body;

    updateProfileFieldsService(memberId, updates, (response) => {
        res.status(response.statusCode).json(response);
    });
}; 
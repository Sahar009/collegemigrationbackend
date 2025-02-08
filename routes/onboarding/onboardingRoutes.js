import express from 'express';
import { checkSchema } from 'express-validator';
import { onboardingValidator } from '../../validations/user/index.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';
import {
    updateMemberProfile,
    getOnboardingStatus,
    validateIdDocuments,
    updateOnboardingSection,
    uploadDocuments,
    getMemberProfile,
    updateProfileFields
} from '../../controllers/onboardingController.js';
import { handleUploadError, uploadFields } from '../../middlewares/uploadMiddleware.js';

const onboardingRouter = express.Router();

// Get member profile
onboardingRouter.get('/profile',
    authenticateUser,
    getMemberProfile
);

// Update complete profile - now includes file upload middleware
onboardingRouter.put('/profile',
    authenticateUser,
    uploadFields, // Handle multiple file uploads
    handleUploadError,
    checkSchema(onboardingValidator),
    updateMemberProfile
);

// Update specific profile fields
onboardingRouter.patch('/profile',
    authenticateUser,
  
    updateProfileFields
);

// Get onboarding status
onboardingRouter.get('/status',
    authenticateUser,
    getOnboardingStatus
);

// Validate ID documents
onboardingRouter.post('/validate-documents',
    authenticateUser,
    validateIdDocuments
);

// Dedicated document upload endpoint
onboardingRouter.post('/upload-documents',
    authenticateUser,
    uploadFields,
    handleUploadError,
    uploadDocuments
);

// Update specific section
onboardingRouter.put('/section/:section',
    authenticateUser,
    updateOnboardingSection
);

export default onboardingRouter; 
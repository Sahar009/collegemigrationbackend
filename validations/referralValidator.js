import { REFERRAL_STATUS } from '../constants/referral.js';

const referralValidator = {
    validateReferral: (data) => {
        const errors = [];
        const { memberId } = data;

        // Validate memberId
        if (!memberId) {
            errors.push('Member ID is required');
        } else if (typeof memberId !== 'number') {
            errors.push('Member ID must be a number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    validateStatusUpdate: (data) => {
        const errors = [];
        const { status } = data;

        // Validate status
        if (!status) {
            errors.push('Status is required');
        } else if (typeof status !== 'string') {
            errors.push('Status must be a string');
        } else if (!Object.values(REFERRAL_STATUS).includes(status)) {
            errors.push(`Status must be one of: ${Object.values(REFERRAL_STATUS).join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

export default referralValidator; 
import { createReferralService, getReferralsService, getReferralStatsService, updateReferralStatusService } from '../service/referralService.js';
import { messageHandler } from '../utils/index.js';
import referralValidator from '../validations/referralValidator.js';

export const createReferral = async (req, res) => {
    try {
        const { error, value } = referralValidator.validateReferral(req.body);
        if (error) {
            return res.status(400).json(messageHandler(error.details[0].message, false, 400));
        }

        const { memberId } = value;
        const referralType = req.user.role; // From auth middleware
        const referrerId = req.user.id;

        const result = await createReferralService({
            referralType,
            referrerId,
            memberId
        });

        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Create referral error:', error);
        return res.status(500).json(messageHandler(error.message, false, 500));
    }
};

export const getReferrals = async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 10 } = req.query;
        const referrerId = req.user.id;
        
        // Convert to proper case (first letter uppercase)
        const referralType = req.user.role === 'agent' ? 'Agent' : 'Member';

        const result = await getReferralsService({
            referrerId,
            referralType,
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get referrals error:', error);
        return res.status(500).json(messageHandler(error.message, false, 500));
    }
};

export const updateReferralStatus = async (req, res) => {
    try {
        const { error, value } = referralValidator.validateStatusUpdate(req.body);
        if (error) {
            return res.status(400).json(messageHandler(error.details[0].message, false, 400));
        }

        const { referralId } = req.params;
        const { status } = value;
        const userId = req.user.id;

        const result = await updateReferralStatusService(referralId, status, userId);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Update referral status error:', error);
        return res.status(500).json(messageHandler(error.message, false, 500));
    }
};

export const getReferralStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        const result = await getReferralStatsService(userId, userRole);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get referral stats error:', error);
        return res.status(500).json(messageHandler(error.message, false, 500));
    }
}; 
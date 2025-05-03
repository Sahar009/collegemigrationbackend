import { createReferralService, getReferralsService, getReferralStatsService, updateReferralStatusService, getAdminReferralsService, getAdminReferralStatsService } from '../service/referralService.js';
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

export const getAdminReferrals = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = 'all',
            referrerType = 'all',
            startDate,
            endDate 
        } = req.query;

        // Validate admin role (assuming you have middleware for this)
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json(
                messageHandler('Unauthorized access', false, 403)
            );
        }

        const result = await getAdminReferralsService({
            page,
            limit,
            status,
            referrerType,
            startDate,
            endDate
        });

        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get admin referrals error:', error);
        return res.status(500).json(
            messageHandler(error.message || 'Failed to retrieve referrals', false, 500)
        );
    }
};

export const getAdminReferralStats = async (req, res) => {
    try {
      

        const result = await getAdminReferralStatsService();
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get admin referral stats error:', error);
        return res.status(500).json(
            messageHandler(error.message || 'Failed to retrieve referral statistics', false, 500)
        );
    }
};
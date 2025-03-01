import { registerMemberWithReferral, getReferrals } from '../service/referralService.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';

export const registerMemberWithReferralController = async (req, res) => {
    try {
        const result = await registerMemberWithReferral(req.body);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        console.error('Registration controller error:', error);
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
};

export const getReferralsController = async (req, res) => {
    try {
        const { refId } = req.params;
        const { status = 'all' } = req.query;

        const result = await getReferrals(refId, status);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        console.error('Get referrals controller error:', error);
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message || 'Failed to fetch referrals'
        });
    }
}; 
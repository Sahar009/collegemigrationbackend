import { Member } from '../schema/memberSchema.js';
import Referral from '../schema/ReferralSchema.js';
import Application from '../schema/ApplicationSchema.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

export const registerMemberWithReferral = async (data) => {
    try {
        const {
            firstname,
            lastname,
            phone,
            email,
            password,
            ref,
            refId
        } = data;

        // Check if email already exists
        const existingMember = await Member.findOne({
            where: { email }
        });

        if (existingMember) {
            throw new Error('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create member
        const newMember = await Member.create({
            firstname,
            lastname,
            email,
            phone,
            password: hashedPassword,
            memberStatus: 'PENDING' // Using the correct ENUM value from Member schema
        });

        // Create referral record
        await Referral.create({
            ref,
            refId,
            memberId: newMember.memberId,
            refStatus: 'unpaid'
        });

        return {
            success: true,
            message: 'Registration successful',
            data: newMember
        };
    } catch (error) {
        console.error('Member registration error:', error);
        throw error;
    }
};

export const getReferrals = async (refId, status = 'all') => {
    try {
        let whereClause = {
            ref: 'Member',
            refId
        };

        if (status !== 'all') {
            whereClause.refStatus = status;
        }

        const referrals = await Referral.findAll({
            where: whereClause,
            include: [{
                model: Member,
                include: [{
                    model: Application,
                    attributes: ['applicationId', 'paymentStatus']
                }]
            }]
        });

        return {
            success: true,
            data: referrals.map(ref => ({
                referral: ref,
                member: ref.Member,
                applications: {
                    total: ref.Member.Applications?.length || 0,
                    paid: ref.Member.Applications?.filter(app => app.paymentStatus === 'Paid').length || 0
                }
            }))
        };
    } catch (error) {
        console.error('Get referrals error:', error);
        throw error;
    }
}; 
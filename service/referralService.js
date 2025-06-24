import { Member } from '../schema/memberSchema.js';
import Referral from '../schema/ReferralSchema.js';
import Application from '../schema/ApplicationSchema.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import Wallet from '../schema/WalletSchema.js';
import WalletTransaction from '../schema/WalletTransactionSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';
import { REFERRAL_STATUS, getCommissionRates } from '../constants/referral.js';
import { generateReference } from '../utils/reference.js';
import { Agent } from '../schema/AgentSchema.js';


const baseUrl = process.env.FRONTEND_URL || "https://collegemigrationmain.vercel.app/";

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

export const createReferralService = async ({ referralType, referrerId, memberId }) => {
    const t = await sequelize.transaction();
    
    try {
        // Validate member exists
        const member = await Member.findByPk(memberId);
        if (!member) {
            await t.rollback();
            return messageHandler('Member not found', false, 404);
        }

        // Check existing referral
        const existingReferral = await Referral.findOne({
            where: { memberId },
            transaction: t
        });

        if (existingReferral) {
            await t.rollback();
            return messageHandler('Member already has a referrer', false, 400);
        }

        // Create referral
        const referral = await Referral.create({
            referralType,
            referrerId,
            memberId,
            status: REFERRAL_STATUS.UNPAID
        }, { transaction: t });

        // Initialize wallet if doesn't exist
        await Wallet.findOrCreate({
            where: { 
                userId: referrerId,
                userType: referralType
            },
            defaults: { balance: 0 },
            transaction: t
        });

        await t.commit();
        return messageHandler('Referral created successfully', true, 201, referral);

    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const getReferralsService = async ({ referrerId, referralType, status, page, limit }) => {
    try {
        const whereClause = {
            referrerId,
            referrerType: referralType
        };

        if (status !== 'all') {
            whereClause.status = status;
        }

        // Set up include options with the updated association names
        const includeOptions = [{
            model: Member,
            as: 'referredMember',
            attributes: ['firstname', 'lastname', 'email'],
            include: [{
                model: Application,
                as: 'memberApplications',  // Updated to match the new association name
                attributes: ['applicationId', 'paymentStatus']
            }]
        }];

        const { count, rows: referrals } = await Referral.findAndCountAll({
            where: whereClause,
            include: includeOptions,
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        return messageHandler('Referrals retrieved successfully', true, 200, {
            referrals,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                pageSize: limit
            }
        });

    } catch (error) {
        console.error('Referral service error:', {
            message: error.message,
            stack: error.stack,
            details: error
        });
        throw error;
    }
};

export const updateReferralStatusService = async (referralId, status, userId) => {
    const t = await sequelize.transaction();
    
    try {
        const referral = await Referral.findOne({
            where: { 
                referralId,
                referrerId: userId // Ensure user owns this referral
            },
            transaction: t
        });
        
        if (!referral) {
            await t.rollback();
            return messageHandler('Referral not found or unauthorized', false, 404);
        }

        if (referral.status === status) {
            await t.rollback();
            return messageHandler('Referral already in this status', false, 400);
        }

        await referral.update({
            status,
            statusDate: new Date()
        }, { transaction: t });

        // Handle commission for paid status
        if (status === REFERRAL_STATUS.PAID) {
            const commissionRates = await getCommissionRates();
            const commissionAmount = commissionRates[referral.referralType];
            
            const wallet = await Wallet.findOne({
                where: {
                    userId: referral.referrerId,
                    userType: referral.referralType
                },
                transaction: t
            });

            if (!wallet) {
                await t.rollback();
                return messageHandler('Wallet not found', false, 404);
            }

            // Create commission transaction
            await createWalletTransaction({
                walletId: wallet.walletId,
                type: 'commission',
                amount: commissionAmount,
                status: 'Completed',
                metadata: {
                    referralId,
                    memberId: referral.memberId
                }
            }, t);

            // Update wallet balance
            await wallet.update({
                balance: sequelize.literal(`balance + ${commissionAmount}`)
            }, { transaction: t });
        }

        await t.commit();
        return messageHandler('Referral status updated successfully', true, 200, referral);

    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const getReferralStatsService = async (userId, userRole) => {
    try {
        const commissionRates = await getCommissionRates(); 
        const [referralStats, wallet] = await Promise.all([
            Referral.findAll({
                where: {
                    referrerId: userId,
                    referralType: userRole
                },
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('referralId')), 'count'],
                    [sequelize.fn('SUM', 
                        sequelize.literal(`CASE WHEN status = '${REFERRAL_STATUS.PAID}' 
                        THEN ${commissionRates[userRole]} ELSE 0 END`)
                    ), 'totalEarnings']
                ],
                group: ['status']
            }),
            Wallet.findOne({
                where: {
                    userId,
                    userType: userRole
                }
            })
        ]);

        const stats = {
            total: 0,
            paid: 0,
            unpaid: 0,
            totalEarnings: 0,
            currentBalance: wallet?.balance || 0
        };

        referralStats.forEach(stat => {
            stats.total += parseInt(stat.get('count'));
            stats[stat.status.toLowerCase()] = parseInt(stat.get('count'));
            if (stat.status === REFERRAL_STATUS.PAID) {
                stats.totalEarnings = parseFloat(stat.get('totalEarnings'));
            }
        });

        return messageHandler('Referral statistics retrieved successfully', true, 200, stats);

    } catch (error) {
        throw error;
    }
}; 
// Generate referral code using the same reference generator as payments
const generateReferralCode = () => {
    return generateReference('REF');
};

export const generateReferralLink = async (userId, userType) => {
    try {
        const referralCode = generateReferralCode();
        
        if (userType === 'Agent') {
            await Agent.update(
                { referralCode },
                { where: { agentId: userId }}
            );
        } else {
            await Member.update(
                { referralCode },
                { where: { memberId: userId }}
            );
        }

        const referralLink = `${baseUrl}/register?ref=${referralCode}&type=${userType}&id=${userId}`;

        return messageHandler(
            'Referral link generated successfully',
            true,
            200,
            { referralCode, referralLink }
        );
    } catch (error) {
        console.error('Generate referral link error:', error);
        throw error;
    }
};

const getMemberReferrals = async (memberId) => {
    try {
        const member = await Member.findByPk(memberId, {
            include: [{
                model: Referral,
                as: 'memberReferrals',
                include: [{
                    model: Member,
                    as: 'referredMember'
                }]
            }]
        });
        return member;
    } catch (error) {
        console.error('Error fetching member referrals:', error);
        throw error;
    }
};

const getAgentReferrals = async (agentId) => {
    try {
        const agent = await Agent.findByPk(agentId, {
            include: [{
                model: Referral,
                as: 'agentReferrals',
                include: [{
                    model: Member,
                    as: 'referredMember'
                }]
            }]
        });
        return agent;
    } catch (error) {
        console.error('Error fetching agent referrals:', error);
        throw error;
    }
};

export const getAdminReferralsService = async ({ page = 1, limit = 10, status, referrerType, startDate, endDate }) => {
    try {
        const whereClause = {};
        
        // Add filters if provided
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        
        if (referrerType && referrerType !== 'all') {
            whereClause.referrerType = referrerType;
        }
        
        if (startDate && endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Get referrals with referred member info
        const { count, rows: referrals } = await Referral.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Member,
                    as: 'referredMember',
                    attributes: ['memberId', 'firstname', 'lastname', 'email', 'phone', 'createdAt']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        // Get applications for each referred member
        const referralIds = referrals.map(ref => ref.memberId);
        const applications = await Application.findAll({
            where: {
                memberId: {
                    [Op.in]: referralIds
                }
            },
            attributes: ['memberId', 'applicationId', 'applicationStatus', 'paymentStatus', 'applicationDate']
        });

        // Create a map of memberId to applications
        const applicationMap = applications.reduce((acc, app) => {
            if (!acc[app.memberId]) {
                acc[app.memberId] = [];
            }
            acc[app.memberId].push(app);
            return acc;
        }, {});

        // Get referrer details separately
        const referrerPromises = referrals.map(async (referral) => {
            if (referral.referrerType === 'Agent') {
                const agent = await Agent.findByPk(referral.referrerId, {
                    attributes: ['agentId', 'companyName', 'email', 'phone']
                });
                return {
                    ...referral.toJSON(),
                    referringAgent: agent
                };
            } else {
                const member = await Member.findByPk(referral.referrerId, {
                    attributes: ['memberId', 'firstname', 'lastname', 'email', 'phone']
                });
                return {
                    ...referral.toJSON(),
                    referringMember: member
                };
            }
        });

        const referralsWithReferrers = await Promise.all(referrerPromises);

        // Format the data for better readability
        const formattedReferrals = referralsWithReferrers.map(referral => ({
            referralId: referral.referralId,
            referralCode: referral.referralCode,
            status: referral.status,
            createdAt: referral.createdAt,
            statusDate: referral.statusDate,
            referrerType: referral.referrerType,
            
            // Referrer details
            referrer: referral.referrerType === 'Agent' 
                ? {
                    type: 'Agent',
                    id: referral.referringAgent?.agentId,
                    name: referral.referringAgent?.companyName,
                    email: referral.referringAgent?.email,
                    phone: referral.referringAgent?.phone
                }
                : {
                    type: 'Member',
                    id: referral.referringMember?.memberId,
                    name: `${referral.referringMember?.firstname} ${referral.referringMember?.lastname}`,
                    email: referral.referringMember?.email,
                    phone: referral.referringMember?.phone
                },
            
            // Referred member details
            referredMember: {
                id: referral.referredMember?.memberId,
                name: `${referral.referredMember?.firstname} ${referral.referredMember?.lastname}`,
                email: referral.referredMember?.email,
                phone: referral.referredMember?.phone,
                registrationDate: referral.referredMember?.createdAt,
                applications: applicationMap[referral.memberId] || []
            }
        }));

        return messageHandler('Referrals retrieved successfully', true, 200, {
            referrals: formattedReferrals,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                pageSize: parseInt(limit)
            },
            summary: {
                totalReferrals: count,
                totalPaidReferrals: referrals.filter(r => r.status === 'paid').length,
                totalUnpaidReferrals: referrals.filter(r => r.status === 'unpaid').length
            }
        });

    } catch (error) {
        console.error('Admin referral service error:', error);
        throw error;
    }
};

export const getAdminReferralStatsService = async () => {
    try {
        // Get overall referral statistics
        const [results] = await sequelize.query(`
            SELECT 
                r.referrerType,
                COUNT(DISTINCT r.referrerId) as totalReferrers,
                COUNT(DISTINCT r.memberId) as totalReferred,
                COUNT(CASE WHEN r.status = 'paid' THEN 1 END) as paidReferrals,
                COUNT(CASE WHEN r.status = 'unpaid' THEN 1 END) as unpaidReferrals
            FROM referrals r
            GROUP BY r.referrerType
        `);

        // Get top referrers
        const [topAgentReferrers] = await sequelize.query(`
            SELECT 
                r.referrerId,
                a.companyName as referrerName,
                a.email as referrerEmail,
                COUNT(r.memberId) as totalReferred,
                COUNT(CASE WHEN r.status = 'paid' THEN 1 END) as paidReferrals
            FROM referrals r
            JOIN agents a ON r.referrerId = a.agentId
            WHERE r.referrerType = 'Agent'
            GROUP BY r.referrerId, a.companyName, a.email
            ORDER BY totalReferred DESC
            LIMIT 10
        `);

        const [topMemberReferrers] = await sequelize.query(`
            SELECT 
                r.referrerId,
                CONCAT(m.firstname, ' ', m.lastname) as referrerName,
                m.email as referrerEmail,
                COUNT(r.memberId) as totalReferred,
                COUNT(CASE WHEN r.status = 'paid' THEN 1 END) as paidReferrals
            FROM referrals r
            JOIN member_personal_information m ON r.referrerId = m.memberId
            WHERE r.referrerType = 'Member'
            GROUP BY r.referrerId, m.firstname, m.lastname, m.email
            ORDER BY totalReferred DESC
            LIMIT 10
        `);

        return messageHandler('Referral statistics retrieved successfully', true, 200, {
            overallStats: results,
            topReferrers: {
                agents: topAgentReferrers,
                members: topMemberReferrers
            }
        });

    } catch (error) {
        console.error('Get admin referral stats error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve referral statistics',
            false,
            500
        );
    }
};
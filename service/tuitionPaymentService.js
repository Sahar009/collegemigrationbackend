import TuitionPayment from '../schema/TuitionPaymentSchema.js';
import { PaymentConfig } from '../schema/paymentConfigSchema.js';
import { Transaction } from '../schema/transactionSchema.js';
import Application from '../schema/ApplicationSchema.js';
import { Member } from '../schema/memberSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';
import PaymentProviderService from './paymentProviderService.js';
import { Op } from 'sequelize';

export const initiateTuitionPayment = async (data) => {
    try {
        const { 
            applicationId, 
            memberId, 
            amount, 
            currency, 
            paymentMethod,
            email 
        } = data;

        // Get currency configuration and exchange rate
        const currencyConfig = await PaymentConfig.findOne({
            where: { 
                currency,
                isActive: true
            }
        });

        if (!currencyConfig) {
            throw new Error("Selected currency is not supported");
        }

        // Convert amount to USD
        const amountInUSD = amount / currencyConfig.exchangeRate;

        // Generate payment reference
        const paymentReference = `TUI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create transaction record
        const transaction = await Transaction.create({
            applicationId,
            memberId,
            amount,
            currency,
            amountInUSD,
            paymentMethod,
            paymentProvider: 'paystack', // or your default provider
            paymentReference,
            status: 'pending',
            metadata: { email, type: 'tuition' }
        });

        // Create tuition payment record
        const tuitionPayment = await TuitionPayment.create({
            applicationId,
            memberId,
            amount,
            currency,
            amountInUSD,
            paymentReference,
            transactionId: transaction.transactionId,
            paymentMethod,
            paymentProvider: 'paystack',
            metadata: { email }
        });

        // Initialize payment with provider
        const paymentProvider = new PaymentProviderService('paystack');
        const paymentInit = await paymentProvider.initializePayment({
            email,
            amount: Math.round(amount * 100),
            currency,
            reference: paymentReference,
            callback_url: process.env.FRONTEND_URL + "/payment/verify",
            metadata: {
                type: 'tuition',
                tuitionPaymentId: tuitionPayment.paymentId,
                applicationId,
                memberId
            }
        });

        return messageHandler("Tuition payment initiated successfully", true, SUCCESS, {
            tuitionPayment,
            transaction,
            paymentInit
        });

    } catch (error) {
        console.error('Tuition payment initiation error:', error);
        throw error;
    }
};

export const getTuitionPayments = async (filters) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            startDate, 
            endDate,
            memberId,
            applicationId 
        } = filters;

        const whereClause = {};

        if (status) {
            whereClause.status = status;
        }

        if (startDate && endDate) {
            whereClause.paymentDate = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        if (memberId) {
            whereClause.memberId = memberId;
        }

        if (applicationId) {
            whereClause.applicationId = applicationId;
        }

        const { count, rows: payments } = await TuitionPayment.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['firstname', 'lastname', 'email']
                },
                {
                    model: Application,
                    as: 'application',
                    attributes: ['applicationId', 'programId', 'applicationStatus']
                },
                {
                    model: Transaction,
                    as: 'transaction',
                    attributes: ['transactionId', 'status', 'paymentProvider']
                }
            ],
            order: [['paymentDate', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        // Format the response
        const formattedPayments = payments.map(payment => ({
            paymentId: payment.paymentId,
            reference: payment.paymentReference,
            amount: payment.amount,
            amountInUSD: payment.amountInUSD,
            currency: payment.currency,
            status: payment.status,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            member: payment.member ? {
                name: `${payment.member.firstname} ${payment.member.lastname}`,
                email: payment.member.email
            } : null,
            application: payment.application ? {
                id: payment.application.applicationId,
                programId: payment.application.programId,
                status: payment.application.applicationStatus
            } : null,
            transaction: payment.transaction ? {
                id: payment.transaction.transactionId,
                status: payment.transaction.status,
                provider: payment.transaction.paymentProvider
            } : null
        }));

        return messageHandler("Tuition payments retrieved successfully", true, SUCCESS, {
            payments: formattedPayments,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                pageSize: parseInt(limit)
            },
            summary: {
                totalPayments: count,
                completedPayments: payments.filter(p => p.status === 'completed').length,
                pendingPayments: payments.filter(p => p.status === 'pending').length,
                failedPayments: payments.filter(p => p.status === 'failed').length,
                refundedPayments: payments.filter(p => p.status === 'refunded').length
            }
        });

    } catch (error) {
        console.error('Get tuition payments error:', error);
        throw error;
    }
};

export const verifyTuitionPayment = async (reference) => {
    try {
        const tuitionPayment = await TuitionPayment.findOne({
            where: { paymentReference: reference }
        });

        if (!tuitionPayment) {
            throw new Error('Tuition payment not found');
        }

        const paymentProvider = new PaymentProviderService('paystack');
        const verification = await paymentProvider.verifyPayment(reference);

        if (verification.data.status === true && verification.data.data.status === 'success') {
            // Update tuition payment status
            await tuitionPayment.update({ status: 'completed' });

            // Update transaction status
            await Transaction.update(
                { status: 'completed' },
                { where: { transactionId: tuitionPayment.transactionId } }
            );

            // Update application status or any other necessary updates
            await Application.update(
                { paymentStatus: 'Paid' },
                { where: { applicationId: tuitionPayment.applicationId } }
            );

            return messageHandler("Payment verified successfully", true, SUCCESS, {
                tuitionPayment,
                verificationData: verification.data
            });
        }

        return messageHandler("Payment verification failed", false, BAD_REQUEST, verification.data);

    } catch (error) {
        console.error('Tuition payment verification error:', error);
        throw error;
    }
}; 
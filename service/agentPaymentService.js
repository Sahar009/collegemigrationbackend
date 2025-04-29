import AgentTransaction from '../schema/AgentTransactionSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import { messageHandler } from '../utils/index.js';
import { v4 as uuidv4 } from 'uuid';
import PaymentProviderService from './paymentProviderService.js';
import AgentStudent from '../schema/AgentStudentSchema.js';

// Define supported currencies
const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'ZAR', 'KES'];

// Helper function to generate reference
const generateReference = () => {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Initialize payment with specific provider
const initializeProviderPayment = async (provider, transaction) => {
    try {
        const paymentProvider = new PaymentProviderService(provider);
        
        const paymentData = {
            email: transaction.metadata.email,
            amount: Math.round(transaction.amount * 100),
            currency: transaction.currency,
            reference: transaction.paymentReference,
            callback_url: process.env.FRONTEND_URL + "/agent/payment/verify",
            metadata: {
                custom_fields: transaction.metadata.custom_fields
            },
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
        };

        console.log('Payment provider data:', paymentData);

        const response = await paymentProvider.initializePayment(paymentData);
        
        return {
            provider,
            publicKey: paymentProvider.getPublicKey(),
            channels: paymentProvider.getChannels(),
            authorization_url: response.data.authorization_url,
            access_code: response.data.access_code,
            reference: response.data.reference
        };

    } catch (error) {
        console.error('Payment provider initialization error:', error);
        throw new Error('Payment initialization failed: ' + error.message);
    }
};

export const initiateAgentPayment = async (agentId, data) => {
    try {
        console.log('Payment initiation data:', data);

        // Validate required fields
        if (!data.applicationId || !data.memberId || !data.amount || !data.agentId) {
            return messageHandler(
                'Missing required fields: applicationId, memberId, amount, and agentId are required',
                false,
                400
            );
        }

        // Check for existing pending transaction
        const existingTransaction = await AgentTransaction.findOne({
            where: {
                applicationId: data.applicationId,
                memberId: data.memberId,
                agentId: data.agentId,
                status: 'pending'
            }
        });

        if (existingTransaction) {
            // Return existing transaction details
            const paymentInit = await initializeProviderPayment('paystack', existingTransaction);

            return messageHandler(
                'Payment re-initiated with existing transaction',
                true,
                200,
                {
                    transaction: {
                        id: existingTransaction.transactionId,
                        reference: existingTransaction.paymentReference,
                        amount: existingTransaction.amount,
                        currency: existingTransaction.currency,
                        status: existingTransaction.status
                    },
                    payment: {
                        authorization_url: paymentInit.authorization_url,
                        access_code: paymentInit.access_code,
                        reference: paymentInit.reference,
                        publicKey: paymentInit.publicKey
                    }
                }
            );
        }

        // Verify application
        const application = await AgentApplication.findOne({
            where: {
                applicationId: data.applicationId,
                agentId: agentId
            }
        });

        if (!application) {
            return messageHandler(
                'Application not found or does not belong to this agent',
                false,
                404
            );
        }

        // Validate email from payload
        if (!data.metadata?.email) {
            return messageHandler(
                'Email is required in metadata',
                false,
                400
            );
        }

        // Create new transaction only if no pending transaction exists
        const transaction = await AgentTransaction.create({
            transactionId: uuidv4(),
            applicationId: data.applicationId,
            memberId: data.memberId,
            agentId: data.agentId,
            amount: parseFloat(data.amount),
            currency: (data.currency || 'NGN').toUpperCase(),
            amountInUSD: parseFloat(data.amount),
            paymentMethod: data.paymentMethod || 'card',
            paymentProvider: 'paystack',
            status: 'pending',
            paymentReference: generateReference(),
            metadata: {
                email: data.metadata.email,
                custom_fields: [
                    {
                        display_name: "Application ID",
                        variable_name: "application_id",
                        value: data.applicationId.toString()
                    },
                    {
                        display_name: "Member ID",
                        variable_name: "member_id",
                        value: data.memberId.toString()
                    }
                ]
            }
        });

        console.log('Created new transaction:', transaction.toJSON());

        // Initialize payment
        const paymentInit = await initializeProviderPayment('paystack', transaction);

        return messageHandler(
            'Payment initiated successfully',
            true,
            200,
            {
                transaction: {
                    id: transaction.transactionId,
                    reference: transaction.paymentReference,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    status: transaction.status
                },
                payment: {
                    authorization_url: paymentInit.authorization_url,
                    access_code: paymentInit.access_code,
                    reference: paymentInit.reference,
                    publicKey: paymentInit.publicKey
                }
            }
        );

    } catch (error) {
        console.error('Payment initiation error:', {
            message: error.message,
            stack: error.stack,
            data: error.response?.data
        });
        return messageHandler(
            error.message || 'Failed to initiate payment',
            false,
            500
        );
    }
};

export const verifyAgentPayment = async (reference) => {
    try {
        const transaction = await AgentTransaction.findOne({
            where: { paymentReference: reference }
        });

        if (!transaction) {
            return messageHandler(
                'Transaction not found',
                false,
                404
            );
        }

        // Verify payment with Paystack
        const paymentProvider = new PaymentProviderService('paystack');
        const response = await paymentProvider.verifyPayment(reference);

        if (response.data.status === true && response.data.data.status === 'success') {
            // Update transaction status
            await transaction.update({ status: 'completed' });

            // Update application payment status
            await AgentApplication.update(
                { paymentStatus: 'paid' },
                { where: { applicationId: transaction.applicationId } }
            );

            return messageHandler(
                'Payment verified successfully',
                true,
                200,
                {
                    transaction,
                    verificationData: response.data
                }
            );
        }

        return messageHandler(
            'Payment verification failed',
            false,
            400,
            response.data
        );

    } catch (error) {
        console.error('Payment verification error:', error);
        return messageHandler(
            error.message || 'Failed to verify payment',
            false,
            500
        );
    }
}; 
import { Transaction } from '../schema/transactionSchema.js';
import { PaymentConfig } from '../schema/paymentConfigSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';
import PaymentProviderService from './paymentProviderService.js';

// Payment providers configuration
const paymentProviders = {
    NGN: ['paystack', 'flutterwave'],
    USD: ['stripe'],
    EUR: ['stripe'],
    GBP: ['stripe']
};

export const initiatePayment = async (data, callback) => {
    try {
        const { 
            applicationId, 
            memberId, 
            amount, 
            currency, 
            paymentMethod 
        } = data;

        // Additional validation
        if (!Number.isInteger(applicationId)) {
            throw new Error('Application ID must be an integer');
        }

        // Get currency configuration
        const currencyConfig = await PaymentConfig.findOne({
            where: { 
                currency,
                isActive: true
            }
        });

        // if (!currencyConfig) {
        //     return callback(messageHandler(
        //         "Selected currency is not supported",
        //         false,
        //         BAD_REQUEST
        //     ));
        // }

        // Convert amount to USD for record keeping
        const amountInUSD = amount

        // Determine payment provider based on currency
        const availableProviders = paymentProviders[currency];
        const paymentProvider = availableProviders[0];

        // Create transaction record with explicit type casting
        const transaction = await Transaction.create({
            applicationId: parseInt(applicationId, 10),
            memberId: parseInt(memberId, 10),
            amount: parseFloat(amount),
            currency,
            amountInUSD: parseFloat(amountInUSD),
            paymentMethod,
            paymentProvider,
            paymentReference: generateReference(),
            status: 'pending'
        });

        // Initialize payment with provider
        const paymentInit = await initializeProviderPayment(
            paymentProvider,
            transaction,
            currencyConfig
        );

        return callback(messageHandler(
            "Payment initiated successfully",
            true,
            SUCCESS,
            {
                transaction,
                paymentInit
            }
        ));

    } catch (error) {
        console.error('Payment initiation error:', error);
        return callback(messageHandler(
            error.message || "Error initiating payment",
            false,
            BAD_REQUEST
        ));
    }
};

// Helper function to generate unique reference
const generateReference = () => {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Initialize payment with specific provider
const initializeProviderPayment = async (provider, transaction, currencyConfig) => {
    try {
        const paymentProvider = new PaymentProviderService(provider);
        
        const paymentData = {
            amount: transaction.amount,
            currency: transaction.currency,
            reference: transaction.paymentReference,
            email: transaction.metadata?.email,
            callback_url: `${process.env.FRONTEND_URL}/payment/verify/${provider}`,
            metadata: {
                transactionId: transaction.transactionId,
                applicationId: transaction.applicationId
            }
        };

        const response = await paymentProvider.initializePayment(paymentData);
        
        return {
            provider,
            publicKey: paymentProvider.getPublicKey(),
            channels: paymentProvider.getChannels(),
            data: response
        };

    } catch (error) {
        throw new Error(`${provider} initialization failed: ${error.message}`);
    }
};

// Verify payment status
export const verifyPayment = async (reference, provider, callback) => {
    try {
        let verificationResult;
        
        switch(provider) {
            case 'paystack':
                verificationResult = await verifyPaystackPayment(reference);
                break;
            case 'stripe':
                verificationResult = await verifyStripePayment(reference);
                break;
            case 'flutterwave':
                verificationResult = await verifyFlutterwavePayment(reference);
                break;
            default:
                throw new Error('Unsupported payment provider');
        }

        // Update transaction status
        if (verificationResult.success) {
            await Transaction.update(
                { status: 'completed' },
                { where: { paymentReference: reference } }
            );
        }

        return callback(messageHandler(
            verificationResult.message,
            verificationResult.success,
            SUCCESS,
            verificationResult.data
        ));

    } catch (error) {
        console.error('Payment verification error:', error);
        return callback(messageHandler(
            error.message || "Error verifying payment",
            false,
            BAD_REQUEST
        ));
    }
}; 
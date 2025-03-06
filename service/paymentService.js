import { Transaction } from '../schema/transactionSchema.js';
import { PaymentConfig } from '../schema/paymentConfigSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';
import PaymentProviderService from './paymentProviderService.js';
import  Application  from '../schema/ApplicationSchema.js';
import { Member } from '../schema/memberSchema.js';
import { sendEmail } from '../utils/sendEmail.js';
// Payment providers configuration
const paymentProviders = {
    NGN: ['paystack'],
    USD: ['paystack'],
    EUR: ['paystack'],
    GBP: ['paystack'],
    GHS: ['paystack'],
    ZAR: ['paystack'],
    KES: ['paystack']
};

export const initiatePayment = async (data, callback) => {
    try {
        console.log(data);
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
            status: 'pending',
            metadata: data.metadata
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
        
        // Extract email from metadata
        const email = transaction.metadata?.email;
        
        if (!email) {
            throw new Error('Email is required for payment initialization');
        }

        console.log('Creating payment with reference:', transaction.paymentReference);
        
        // Format the payment data according to Paystack's requirements
        const paymentData = {
            email: transaction.metadata?.email,
            amount: Math.round(transaction.amount * 100), // Convert to kobo and ensure it's an integer
            currency: transaction.currency,
            reference: transaction.paymentReference,
            callback_url: process.env.FRONTEND_URL + "/payment/verify",
            metadata: {
                custom_fields: [
                    {
                        display_name: "Transaction ID",
                        variable_name: "transaction_id",
                        value: transaction.transactionId
                    },
                    {
                        display_name: "Application ID",
                        variable_name: "application_id",
                        value: transaction.applicationId
                    },
                    {
                        display_name: "Member ID",
                        variable_name: "member_id",
                        value: transaction.memberId
                    }
                ]
            },
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
        };

        console.log('Paystack payment data:', paymentData);

        const response = await paymentProvider.initializePayment(paymentData);
        
        return {
            provider,
            publicKey: paymentProvider.getPublicKey(),
            channels: paymentProvider.getChannels(),
            data: response
        };

    } catch (error) {
        console.error('Payment provider initialization error:', error.response?.data || error.message);
        throw new Error(`${provider} initialization failed: ${error.message}`);
    }
};

// Add the verifyPaystackPayment function at the top level
const verifyPaystackPayment = async (reference) => {
    try {
        console.log('Starting Paystack verification for reference:', reference);
        const paymentProvider = new PaymentProviderService('paystack');
        const response = await paymentProvider.verifyPayment(reference);
        console.log('Paystack verification response:', response.data);

        // Check both the outer status and inner data.status
        if (response.data.status === true && response.data.data.status === 'success') {
            return {
                success: true,
                message: 'Payment verified successfully',
                data: response.data
            };
        }

        console.log('Payment verification failed with status:', response.data.status);
        return {
            success: false,
            message: 'Payment verification failed',
            data: response.data
        };
    } catch (error) {
        console.error('Paystack verification error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        throw new Error(`Payment verification failed: ${error.message}`);
    }
};

// Update verifyPayment to include more detailed transaction lookup
export const verifyPayment = async (reference) => {
    try {
        console.log('Starting payment verification for reference:', reference);
        const verificationResult = await verifyPaystackPayment(reference);

        if (verificationResult.success) {
            console.log('Payment verification successful, updating records');
            
            // Get the transaction details
            console.log('Looking for transaction with reference:', reference);
            const transaction = await Transaction.findOne({
                where: { paymentReference: reference }
            });
            
            // Log all transactions to debug
            const allTransactions = await Transaction.findAll({
                limit: 5,
                order: [['createdAt', 'DESC']]
            });
            console.log('Recent transactions:', allTransactions.map(t => ({
                reference: t.paymentReference,
                status: t.status,
                createdAt: t.createdAt
            })));

            if (transaction) {
                // Update transaction status
                await Transaction.update(
                    { status: 'completed' },
                    { where: { paymentReference: reference } }
                );

                // Update application payment status
                await Application.update(
                    { paymentStatus: 'Paid' },
                    { where: { applicationId: transaction.applicationId } }
                );
                console.log('Updated transaction and application status');

                // Fetch member details for the email
                const member = await Member.findByPk(transaction.memberId);
                
                // Send success email
                const emailData = {
                    name: member?.firstName || 'Valued Customer',
                    paymentReference: reference,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    applicationId: transaction.applicationId,
                    paymentMethod: transaction.paymentMethod,
                    paymentDate: new Date().toLocaleDateString(),
                    year: new Date().getFullYear()
                };

                console.log('Sending email with data:', emailData);

                try {
                    await sendEmail({
                        template: 'paymentSuccess',
                        email: transaction.metadata.email,
                        subject: 'Payment Successful - College Migration',
                        data: emailData
                    });
                } catch (error) {
                    console.error('Email sending error details:', {
                        error: error.message,
                        emailData,
                        memberData: member
                    });
                }

            } else {
                console.log('No transaction found. Checking Paystack response data:', verificationResult.data);
                
                // Try to create transaction from Paystack data if it doesn't exist
                const paystackData = verificationResult.data.data;
                if (paystackData) {
                    // Extract applicationId and memberId from custom fields
                    const customFields = paystackData.metadata?.custom_fields || [];
                    const applicationId = customFields.find(field => field.variable_name === 'application_id')?.value;
                    const memberId = customFields.find(field => field.variable_name === 'member_id')?.value;

                    if (!applicationId || !memberId) {
                        throw new Error('Missing required application or member information');
                    }

                    const newTransaction = await Transaction.create({
                        applicationId: parseInt(applicationId),
                        memberId: parseInt(memberId),
                        amount: paystackData.amount / 100, // Convert from kobo back to main currency
                        amountInUSD: paystackData.amount / 100, // You might want to add proper currency conversion here
                        currency: paystackData.currency,
                        paymentMethod: 'paystack',
                        paymentProvider: 'paystack',
                        paymentReference: reference,
                        status: 'completed',
                        metadata: {
                            email: paystackData.customer.email,
                            ...paystackData.metadata
                        }
                    });
                    console.log('Created new transaction from Paystack data:', newTransaction);

                    // Update application payment status
                    await Application.update(
                        { paymentStatus: 'Paid' },
                        { where: { applicationId: parseInt(applicationId) } }
                    );
                    console.log('Updated application payment status');

                    // Fetch member details for the email
                    const member = await Member.findByPk(parseInt(memberId));
                    
                    // Send success email
                    const emailData = {
                        name: member?.firstName || 'Valued Customer',
                        paymentReference: reference,
                        currency: paystackData.currency,
                        amount: paystackData.amount / 100,
                        applicationId: parseInt(applicationId),
                        paymentMethod: 'paystack',
                        paymentDate: new Date().toLocaleDateString(),
                        year: new Date().getFullYear()
                    };

                    console.log('Sending email with data:', emailData);

                    try {
                        await sendEmail({
                            template: 'paymentSuccess',
                            email: paystackData.customer.email,
                            subject: 'Payment Successful - College Migration',
                            data: emailData
                        });
                    } catch (error) {
                        console.error('Email sending error details:', {
                            error: error.message,
                            emailData,
                            memberData: member
                        });
                    }
                }
            }
        }

        return {
            message: verificationResult.message,
            success: verificationResult.success,
            statusCode: SUCCESS,
            data: verificationResult.data
        };

    } catch (error) {
        console.error('Payment verification error:', {
            message: error.message,
            stack: error.stack,
            reference: reference
        });
        return {
            message: error.message || "Error verifying payment",
            success: false,
            statusCode: BAD_REQUEST
        };
    }
}; 
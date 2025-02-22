import { initiatePayment, verifyPayment } from '../service/paymentService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

export const initiatePaymentController = async (req, res) => {
    try {
        const { 
            applicationId, 
            amount, 
            currency, 
            paymentMethod 
        } = req.body;

        // Enhanced validation
        if (!applicationId || typeof applicationId !== 'number') {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Application ID is required and must be a number", 
                    false, 
                    BAD_REQUEST
                )
            );
        }

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Valid amount is required", 
                    false, 
                    BAD_REQUEST
                )
            );
        }

        if (!currency || !['USD', 'EUR', 'GBP', 'NGN'].includes(currency)) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Valid currency is required (USD, EUR, GBP, or NGN)", 
                    false, 
                    BAD_REQUEST
                )
            );
        }

        if (!paymentMethod || typeof paymentMethod !== 'string') {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Valid payment method is required", 
                    false, 
                    BAD_REQUEST
                )
            );
        }

        const paymentData = {
            applicationId: parseInt(applicationId, 10), // Ensure it's an integer
            memberId: req.user.id,
            amount: parseFloat(amount),
            currency: currency.toUpperCase(),
            paymentMethod,
            metadata: {
                email: req.user.email
            }
        };

        await initiatePayment(paymentData, (response) => {
            return res.status(response.statusCode).json(response);
        });

    } catch (error) {
        console.error('Payment controller error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(
                error.message || "Error processing payment request",
                false,
                BAD_REQUEST
            )
        );
    }
};

export const verifyPaymentController = async (req, res) => {
    try {
        const { reference } = req.query;
        console.log('Payment verification request received for reference:', reference);

        if (!reference) {
            console.log('No reference provided in request');
            return res.status(BAD_REQUEST).json({
                message: "Payment reference is required",
                success: false
            });
        }

        const result = await verifyPayment(reference);
        console.log('Verification result:', result);
        
        return res.status(result.statusCode).json({
            message: result.message,
            success: result.success,
            data: result.data
        });
    } catch (error) {
        console.error('Payment verification controller error:', {
            message: error.message,
            stack: error.stack,
            query: req.query
        });
        return res.status(BAD_REQUEST).json({
            message: error.message || "Error verifying payment",
            success: false
        });
    }
};

export const handleWebhookController = async (req, res) => {
    try {
        const provider = req.params.provider;
        const signature = req.headers['x-webhook-signature'];
        const event = req.body;

        // Verify webhook signature based on provider
        // Process webhook event
        // Update transaction status
        
        // Return 200 status to acknowledge receipt
        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(BAD_REQUEST).json({ received: false });
    }
}; 
import { initiateTuitionPayment, getTuitionPayments, verifyTuitionPayment } from '../service/tuitionPaymentService.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';

export const initiateTuitionPaymentController = async (req, res) => {
    try {
        const { 
            applicationId, 
            amount, 
            currency, 
            paymentMethod,
            applicationType = 'regular' // Add applicationType parameter
        } = req.body;

        // Validation
        if (!applicationId || !amount || !currency || !paymentMethod) {
            return res.status(BAD_REQUEST).json(
                messageHandler("All fields are required", false, BAD_REQUEST)
            );
        }

        const paymentData = {
            applicationId: parseInt(applicationId),
            memberId: req.user.id,
            amount: parseFloat(amount),
            currency: currency.toUpperCase(),
            paymentMethod,
            email: req.user.email,
            applicationType // Add applicationType to payment data
        };

        const result = await initiateTuitionPayment(paymentData);
        return res.status(SUCCESS).json(result);

    } catch (error) {
        console.error('Tuition payment controller error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error processing tuition payment", false, BAD_REQUEST)
        );
    }
};

export const getTuitionPaymentsController = async (req, res) => {
    try {
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            memberId: req.query.memberId,
            applicationId: req.query.applicationId
        };

        const result = await getTuitionPayments(filters);
        return res.status(SUCCESS).json(result);

    } catch (error) {
        console.error('Get tuition payments error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error retrieving tuition payments", false, BAD_REQUEST)
        );
    }
};

export const verifyTuitionPaymentController = async (req, res) => {
    try {
        const { reference } = req.query;

        if (!reference) {
            return res.status(BAD_REQUEST).json(
                messageHandler("Payment reference is required", false, BAD_REQUEST)
            );
        }

        const result = await verifyTuitionPayment(reference);
        return res.status(SUCCESS).json(result);

    } catch (error) {
        console.error('Verify tuition payment error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(error.message || "Error verifying tuition payment", false, BAD_REQUEST)
        );
    }
};
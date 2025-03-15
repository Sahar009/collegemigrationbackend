import { initiateAgentPayment, verifyAgentPayment } from '../service/agentPaymentService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

export const initiatePayment = async (req, res) => {
    try {
        const agentId = req.agent.id;
        const result = await initiateAgentPayment(agentId, req.body);
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Payment initiation controller error:', error);
        return res.status(BAD_REQUEST).json(
            messageHandler(
                error.message || 'Error initiating payment',
                false,
                BAD_REQUEST
            )
        );
    }
};

export const verifyPayment = async (req, res) => {
    try {
        // Get reference from query params or body
        const reference = req.query.reference || req.query.trxref || req.params.reference;
        
        console.log('Verifying payment with reference:', reference);

        if (!reference) {
            return res.status(400).json(
                messageHandler(
                    'Payment reference is required',
                    false,
                    400
                )
            );
        }

        const result = await verifyAgentPayment(reference);
        return res.status(result.statusCode).json(result);

    } catch (error) {
        console.error('Payment verification controller error:', error);
        return res.status(500).json(
            messageHandler(
                error.message || 'Error verifying payment',
                false,
                500
            )
        );
    }
}; 
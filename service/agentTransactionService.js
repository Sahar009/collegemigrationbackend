import AgentTransaction from '../schema/AgentTransactionSchema.js';
import { messageHandler } from '../utils/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from './notificationService.js';

export const createAgentTransaction = async (data) => {
    try {
        const transaction = await AgentTransaction.create({
            transactionId: uuidv4(),
            applicationId: data.applicationId,
            memberId: data.memberId,
            amount: data.amount,
            currency: data.currency,
            amountInUSD: data.amountInUSD,
            paymentMethod: data.paymentMethod,
            paymentProvider: data.paymentProvider,
            status: 'pending',
            paymentReference: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            metadata: data.metadata || {}
        });

        // Send notification to agent about the new transaction
        await createNotification({
            userId: data.memberId,
            userType: 'member',
            type: 'payment',
            title: 'New Transaction Created',
            message: `A new transaction of ${data.amount} ${data.currency} has been created for your application.`,
            link: `/member/transactions/${transaction.transactionId}`,
            priority: 1,
            metadata: {
                transactionId: transaction.transactionId,
                amount: data.amount,
                currency: data.currency
            }
        });

        return messageHandler(
            'Transaction created successfully',
            true,
            201,
            transaction
        );
    } catch (error) {
        console.error('Create transaction error:', error);
        return messageHandler(
            'Failed to create transaction',
            false,
            500
        );
    }
}; 
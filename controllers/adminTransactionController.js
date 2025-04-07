import {
  getAllTransactionsService,
  getTransactionByIdService,
  exportTransactionsService
} from '../service/adminTransactionService.js';
import fs from 'fs';
import path from 'path';

// Get all transactions
export const getAllTransactions = async (req, res) => {
  try {
    const result = await getAllTransactionsService(req.query);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Get all transactions error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve transactions',
      statusCode: 500
    });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { transactionId, transactionType } = req.params;
    const result = await getTransactionByIdService(transactionId, transactionType);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve transaction details',
      statusCode: 500
    });
  }
};

// Export transactions to CSV
export const exportTransactions = async (req, res) => {
  try {
    const result = await exportTransactionsService(req.query);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    // Set headers before sending response
    res.set({
      'Content-Type': result.headers['Content-Type'],
      'Content-Disposition': result.headers['Content-Disposition']
    });
    
    // Send the CSV data directly
    res.send(result.data);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during export'
    });
  }
};
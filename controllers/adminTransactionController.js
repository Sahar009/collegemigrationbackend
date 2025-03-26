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
      return res.status(result.statusCode).json(result);
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${result.data.filename}`);
    
    // Stream the file
    const fileStream = fs.createReadStream(result.data.path);
    fileStream.pipe(res);
    
    // Delete the file after sending
    fileStream.on('end', () => {
      fs.unlinkSync(result.data.path);
    });
    
  } catch (error) {
    console.error('Export transactions error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export transactions',
      statusCode: 500
    });
  }
}; 
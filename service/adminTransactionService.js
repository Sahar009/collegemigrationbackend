import AgentTransaction from '../schema/AgentTransactionSchema.js';
import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import { messageHandler } from '../utils/index.js';
import { Op } from 'sequelize';
import { Transaction } from '../schema/transactionSchema.js';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';

// Get all transactions with filtering and pagination
export const getAllTransactionsService = async (query) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      status,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [
          new Date(startDate), 
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (startDate) {
      dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      dateFilter.createdAt = { 
        [Op.lte]: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
      };
    }
    
    // Build status filter
    const statusFilter = status ? { status } : {};
    
    // Combine filters
    const whereConditions = {
      ...dateFilter,
      ...statusFilter
    };
    
    // Get transactions based on type
    let transactions = [];
    let totalCount = 0;
    
    if (type === 'agent') {
      // First, let's get the column names from the agents table to ensure we're using the right ones
      const [agentColumns] = await AgentTransaction.sequelize.query(`
        SHOW COLUMNS FROM agents
      `);
      
      console.log('Agent table columns:', agentColumns.map(col => col.Field));
      
      // Agent transactions - using raw query with correct column names
      const [agentTransactions, agentMetadata] = await AgentTransaction.sequelize.query(`
        SELECT 
          at.transactionId, at.applicationId, at.memberId, at.amount, 
          at.currency, at.amountInUSD, at.paymentMethod, at.paymentProvider,
          at.status, at.paymentReference, at.metadata, at.createdAt, at.updatedAt,
          aa.agentId
        FROM agent_transactions at
        LEFT JOIN agent_applications aa ON at.applicationId = aa.applicationId
        WHERE 1=1
        ${status ? ` AND at.status = '${status}'` : ''}
        ${startDate ? ` AND at.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND at.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
        ORDER BY at.${sortBy} ${sortOrder}
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `);
      
      // Get total count
      const [countResult] = await AgentTransaction.sequelize.query(`
        SELECT COUNT(*) as total
        FROM agent_transactions at
        LEFT JOIN agent_applications aa ON at.applicationId = aa.applicationId
        WHERE 1=1
        ${status ? ` AND at.status = '${status}'` : ''}
        ${startDate ? ` AND at.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND at.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
      `);
      
      totalCount = countResult[0].total;
      
      // Get agent details for each transaction
      const agentIds = agentTransactions.map(tx => tx.agentId).filter(id => id);
      
      let agentDetails = {};
      if (agentIds.length > 0) {
        const [agents] = await AgentTransaction.sequelize.query(`
          SELECT * FROM agents WHERE agentId IN (${agentIds.join(',')})
        `);
        
        // Create a map of agent details by ID
        agentDetails = agents.reduce((acc, agent) => {
          acc[agent.agentId] = agent;
          return acc;
        }, {});
      }
      
      // Format transactions
      transactions = agentTransactions.map(tx => {
        const agent = agentDetails[tx.agentId] || {};
        
        return {
          transactionId: tx.transactionId,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          user: tx.agentId ? {
            userId: tx.agentId,
            userType: 'agent',
            // Use safe property access with fallbacks
            firstname: agent.firstName || agent.firstname || 'Unknown',
            lastname: agent.lastName || agent.lastname || 'Unknown',
            email: agent.email || 'Unknown',
            phone: agent.phone || 'Unknown',
            country: agent.country || 'Unknown',
            status: agent.status || 'Unknown'
          } : null
        };
      });
    } else {
      // Member transactions - using raw query to avoid association conflicts
      const [memberTransactions, memberMetadata] = await Transaction.sequelize.query(`
        SELECT 
          t.transactionId, t.applicationId, t.memberId, t.amount, 
          t.currency, t.amountInUSD, t.paymentMethod, t.paymentProvider,
          t.status, t.paymentReference, t.metadata, t.createdAt, t.updatedAt
        FROM transactions t
        WHERE 1=1
        ${status ? ` AND t.status = '${status}'` : ''}
        ${startDate ? ` AND t.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND t.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
        ORDER BY t.${sortBy} ${sortOrder}
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `);
      
      // Get total count
      const [countResult] = await Transaction.sequelize.query(`
        SELECT COUNT(*) as total
        FROM transactions t
        WHERE 1=1
        ${status ? ` AND t.status = '${status}'` : ''}
        ${startDate ? ` AND t.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND t.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
      `);
      
      totalCount = countResult[0].total;
      
      // Get member details for each transaction
      const memberIds = memberTransactions.map(tx => tx.memberId).filter(id => id);
      
      let memberDetails = {};
      if (memberIds.length > 0) {
        const [members] = await Transaction.sequelize.query(`
          SELECT * FROM member_personal_information WHERE memberId IN (${memberIds.join(',')})
        `);
        
        // Create a map of member details by ID
        memberDetails = members.reduce((acc, member) => {
          acc[member.memberId] = member;
          return acc;
        }, {});
      }
      
      // Format transactions
      transactions = memberTransactions.map(tx => {
        const member = memberDetails[tx.memberId] || {};
        
        return {
          transactionId: tx.transactionId,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          user: tx.memberId ? {
            userId: tx.memberId,
            userType: 'member',
            // Use safe property access with fallbacks
            firstname: member.firstName || member.firstname || 'Unknown',
            lastname: member.lastName || member.lastname || 'Unknown',
            email: member.email || 'Unknown',
            phone: member.phone || 'Unknown',
            country: member.homeCountry || member.country || 'Unknown',
            status: member.memberStatus || 'Unknown'
          } : null
        };
      });
    }
    
    return messageHandler(
      'Transactions retrieved successfully',
      true,
      200,
      {
        transactions,
        pagination: {
          totalItems: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          currentPage: parseInt(page),
          pageSize: parseInt(limit)
        }
      }
    );
  } catch (error) {
    console.error('Get all transactions error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve transactions',
      false,
      500
    );
  }
};

// Get transaction details by ID
export const getTransactionByIdService = async (transactionId, transactionType) => {
  try {
    let transaction;
    let userData = null;
    
    if (transactionType === 'agent') {
      // Get agent transaction details
      const [agentTransactions] = await AgentTransaction.sequelize.query(`
        SELECT 
          at.transactionId, at.applicationId, at.memberId, at.amount, 
          at.currency, at.amountInUSD, at.paymentMethod, at.paymentProvider,
          at.status, at.paymentReference, at.metadata, at.createdAt, at.updatedAt,
          aa.agentId
        FROM agent_transactions at
        LEFT JOIN agent_applications aa ON at.applicationId = aa.applicationId
        WHERE at.transactionId = :transactionId
      `, {
        replacements: { transactionId }
      });
      
      if (!agentTransactions || agentTransactions.length === 0) {
        return messageHandler('Transaction not found', false, 404);
      }
      
      transaction = agentTransactions[0];
      
      // Get agent details if agentId exists
      if (transaction.agentId) {
        const [agents] = await AgentTransaction.sequelize.query(`
          SELECT * FROM agents WHERE agentId = :agentId
        `, {
          replacements: { agentId: transaction.agentId }
        });
        
        if (agents && agents.length > 0) {
          const agent = agents[0];
          userData = {
            userId: agent.agentId,
            userType: 'agent',
            firstname: agent.firstName || agent.firstname || 'Unknown',
            lastname: agent.lastName || agent.lastname || 'Unknown',
            email: agent.email || 'Unknown',
            phone: agent.phone || 'Unknown',
            country: agent.country || 'Unknown',
            status: agent.status || 'Unknown'
          };
        }
      }
      
      // Format transaction data
      const transactionData = {
        ...transaction,
        metadata: transaction.metadata ? (typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata) : {},
        user: userData
      };
      
      return messageHandler(
        'Transaction details retrieved successfully',
        true,
        200,
        transactionData
      );
      
    } else {
      // Get member transaction details
      const [memberTransactions] = await Transaction.sequelize.query(`
        SELECT 
          t.transactionId, t.applicationId, t.memberId, t.amount, 
          t.currency, t.amountInUSD, t.paymentMethod, t.paymentProvider,
          t.status, t.paymentReference, t.metadata, t.createdAt, t.updatedAt
        FROM transactions t
        WHERE t.transactionId = :transactionId
      `, {
        replacements: { transactionId }
      });
      
      if (!memberTransactions || memberTransactions.length === 0) {
        return messageHandler('Transaction not found', false, 404);
      }
      
      transaction = memberTransactions[0];
      
      // Get member details if memberId exists
      if (transaction.memberId) {
        const [members] = await Transaction.sequelize.query(`
          SELECT * FROM member_personal_information WHERE memberId = :memberId
        `, {
          replacements: { memberId: transaction.memberId }
        });
        
        if (members && members.length > 0) {
          const member = members[0];
          userData = {
            userId: member.memberId,
            userType: 'member',
            firstname: member.firstName || member.firstname || 'Unknown',
            lastname: member.lastName || member.lastname || 'Unknown',
            email: member.email || 'Unknown',
            phone: member.phone || 'Unknown',
            country: member.homeCountry || member.country || 'Unknown',
            status: member.memberStatus || 'Unknown'
          };
        }
      }
      
      // Format transaction data
      const transactionData = {
        ...transaction,
        metadata: transaction.metadata ? (typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata) : {},
        user: userData
      };
      
      return messageHandler(
        'Transaction details retrieved successfully',
        true,
        200,
        transactionData
      );
    }
  } catch (error) {
    console.error('Get transaction details error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve transaction details',
      false,
      500
    );
  }
};

// Export transactions to CSV
export const exportTransactionsService = async (query) => {
  try {
    const { 
      status,
      type,
      startDate,
      endDate
    } = query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [
          new Date(startDate), 
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (startDate) {
      dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      dateFilter.createdAt = { 
        [Op.lte]: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
      };
    }
    
    // Build status filter
    const statusFilter = status ? { status } : {};
    
    // Combine filters
    const whereConditions = {
      ...dateFilter,
      ...statusFilter
    };
    
    // Get transactions based on type
    let transactions = [];
    
    if (type === 'agent') {
      // Agent transactions
      const [agentTransactions] = await AgentTransaction.sequelize.query(`
        SELECT 
          at.transactionId, at.applicationId, at.memberId, at.amount, 
          at.currency, at.amountInUSD, at.paymentMethod, at.paymentProvider,
          at.status, at.paymentReference, at.createdAt, at.updatedAt,
          aa.agentId
        FROM agent_transactions at
        LEFT JOIN agent_applications aa ON at.applicationId = aa.applicationId
        WHERE 1=1
        ${status ? ` AND at.status = '${status}'` : ''}
        ${startDate ? ` AND at.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND at.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
        ORDER BY at.createdAt DESC
      `);
      
      // Get agent details for each transaction
      const agentIds = agentTransactions.map(tx => tx.agentId).filter(id => id);
      
      let agentDetails = {};
      if (agentIds.length > 0) {
        const [agents] = await AgentTransaction.sequelize.query(`
          SELECT * FROM agents WHERE agentId IN (${agentIds.join(',')})
        `);
        
        // Create a map of agent details by ID
        agentDetails = agents.reduce((acc, agent) => {
          acc[agent.agentId] = agent;
          return acc;
        }, {});
      }
      
      // Format transactions for CSV
      transactions = agentTransactions.map(tx => {
        const agent = agentDetails[tx.agentId] || {};
        
        return {
          'Transaction ID': tx.transactionId,
          'Date': new Date(tx.createdAt).toLocaleString(),
          'User Type': 'Agent',
          'User ID': tx.agentId || '',
          'Name': `${agent.firstName || agent.firstname || ''} ${agent.lastName || agent.lastname || ''}`.trim() || 'Unknown',
          'Email': agent.email || '',
          'Amount': tx.amount,
          'Currency': tx.currency,
          'Amount (USD)': tx.amountInUSD,
          'Payment Method': tx.paymentMethod,
          'Payment Provider': tx.paymentProvider,
          'Status': tx.status,
          'Reference': tx.paymentReference || ''
        };
      });
    } else if (type === 'member') {
      // Member transactions
      const [memberTransactions] = await Transaction.sequelize.query(`
        SELECT 
          t.transactionId, t.applicationId, t.memberId, t.amount, 
          t.currency, t.amountInUSD, t.paymentMethod, t.paymentProvider,
          t.status, t.paymentReference, t.createdAt, t.updatedAt
        FROM transactions t
        WHERE 1=1
        ${status ? ` AND t.status = '${status}'` : ''}
        ${startDate ? ` AND t.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND t.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
        ORDER BY t.createdAt DESC
      `);
      
      // Get member details for each transaction
      const memberIds = memberTransactions.map(tx => tx.memberId).filter(id => id);
      
      let memberDetails = {};
      if (memberIds.length > 0) {
        const [members] = await Transaction.sequelize.query(`
          SELECT * FROM member_personal_information WHERE memberId IN (${memberIds.join(',')})
        `);
        
        // Create a map of member details by ID
        memberDetails = members.reduce((acc, member) => {
          acc[member.memberId] = member;
          return acc;
        }, {});
      }
      
      // Format transactions for CSV
      transactions = memberTransactions.map(tx => {
        const member = memberDetails[tx.memberId] || {};
        
        return {
          'Transaction ID': tx.transactionId,
          'Date': new Date(tx.createdAt).toLocaleString(),
          'User Type': 'Member',
          'User ID': tx.memberId || '',
          'Name': `${member.firstName || member.firstname || ''} ${member.lastName || member.lastname || ''}`.trim() || 'Unknown',
          'Email': member.email || '',
          'Amount': tx.amount,
          'Currency': tx.currency,
          'Amount (USD)': tx.amountInUSD,
          'Payment Method': tx.paymentMethod,
          'Payment Provider': tx.paymentProvider,
          'Status': tx.status,
          'Reference': tx.paymentReference || ''
        };
      });
    } else {
      // All transactions - get both member and agent transactions
      const [memberTransactions] = await Transaction.sequelize.query(`
        SELECT 
          t.transactionId, t.applicationId, t.memberId, t.amount, 
          t.currency, t.amountInUSD, t.paymentMethod, t.paymentProvider,
          t.status, t.paymentReference, t.createdAt, t.updatedAt
        FROM transactions t
        WHERE 1=1
        ${status ? ` AND t.status = '${status}'` : ''}
        ${startDate ? ` AND t.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND t.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
        ORDER BY t.createdAt DESC
      `);
      
      const [agentTransactions] = await AgentTransaction.sequelize.query(`
        SELECT 
          at.transactionId, at.applicationId, at.memberId, at.amount, 
          at.currency, at.amountInUSD, at.paymentMethod, at.paymentProvider,
          at.status, at.paymentReference, at.createdAt, at.updatedAt,
          aa.agentId
        FROM agent_transactions at
        LEFT JOIN agent_applications aa ON at.applicationId = aa.applicationId
        WHERE 1=1
        ${status ? ` AND at.status = '${status}'` : ''}
        ${startDate ? ` AND at.createdAt >= '${startDate}'` : ''}
        ${endDate ? ` AND at.createdAt <= '${new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString().split('T')[0]}'` : ''}
        ORDER BY at.createdAt DESC
      `);
      
      // Get member details
      const memberIds = memberTransactions.map(tx => tx.memberId).filter(id => id);
      let memberDetails = {};
      if (memberIds.length > 0) {
        const [members] = await Transaction.sequelize.query(`
          SELECT * FROM member_personal_information WHERE memberId IN (${memberIds.join(',')})
        `);
        memberDetails = members.reduce((acc, member) => {
          acc[member.memberId] = member;
          return acc;
        }, {});
      }
      
      // Get agent details
      const agentIds = agentTransactions.map(tx => tx.agentId).filter(id => id);
      let agentDetails = {};
      if (agentIds.length > 0) {
        const [agents] = await AgentTransaction.sequelize.query(`
          SELECT * FROM agents WHERE agentId IN (${agentIds.join(',')})
        `);
        agentDetails = agents.reduce((acc, agent) => {
          acc[agent.agentId] = agent;
          return acc;
        }, {});
      }
      
      // Format member transactions
      const formattedMemberTransactions = memberTransactions.map(tx => {
        const member = memberDetails[tx.memberId] || {};
        return {
          'Transaction ID': tx.transactionId,
          'Date': new Date(tx.createdAt).toLocaleString(),
          'User Type': 'Member',
          'User ID': tx.memberId || '',
          'Name': `${member.firstName || member.firstname || ''} ${member.lastName || member.lastname || ''}`.trim() || 'Unknown',
          'Email': member.email || '',
          'Amount': tx.amount,
          'Currency': tx.currency,
          'Amount (USD)': tx.amountInUSD,
          'Payment Method': tx.paymentMethod,
          'Payment Provider': tx.paymentProvider,
          'Status': tx.status,
          'Reference': tx.paymentReference || ''
        };
      });
      
      // Format agent transactions
      const formattedAgentTransactions = agentTransactions.map(tx => {
        const agent = agentDetails[tx.agentId] || {};
        return {
          'Transaction ID': tx.transactionId,
          'Date': new Date(tx.createdAt).toLocaleString(),
          'User Type': 'Agent',
          'User ID': tx.agentId || '',
          'Name': `${agent.firstName || agent.firstname || ''} ${agent.lastName || agent.lastname || ''}`.trim() || 'Unknown',
          'Email': agent.email || '',
          'Amount': tx.amount,
          'Currency': tx.currency,
          'Amount (USD)': tx.amountInUSD,
          'Payment Method': tx.paymentMethod,
          'Payment Provider': tx.paymentProvider,
          'Status': tx.status,
          'Reference': tx.paymentReference || ''
        };
      });
      
      // Combine and sort by date (newest first)
      transactions = [...formattedMemberTransactions, ...formattedAgentTransactions]
        .sort((a, b) => new Date(b.Date) - new Date(a.Date));
    }
    
    // Generate CSV
    const fields = [
      'Transaction ID', 'Date', 'User Type', 'User ID', 'Name', 'Email',
      'Amount', 'Currency', 'Amount (USD)', 'Payment Method', 'Payment Provider',
      'Status', 'Reference'
    ];
    
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(transactions);
    
    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transactions_export_${timestamp}.csv`;
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, filename);
    
    // Write CSV to file
    fs.writeFileSync(filePath, csv);
    
    return {
      success: true,
      message: 'Transactions exported successfully',
      statusCode: 200,
      data: {
        filename,
        path: filePath,
        count: transactions.length
      }
    };
  } catch (error) {
    console.error('Export transactions error:', error);
    return messageHandler(
      error.message || 'Failed to export transactions',
      false,
      500
    );
  }
}; 
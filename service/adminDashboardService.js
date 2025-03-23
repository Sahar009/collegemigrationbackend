import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import Application from '../schema/ApplicationSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import AgentTransaction from '../schema/AgentTransactionSchema.js';
import Referral from '../schema/ReferralSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';
import { Op } from 'sequelize';
import { Transaction } from '../schema/TransactionSchema.js';

export const getDashboardMetricsService = async (startDate = null, endDate = null) => {
  try {
    // Format date filters - using applicationDate for applications instead of createdAt
    let transactionDateFilter = '';
    let applicationDateFilter = '';
    let agentApplicationDateFilter = '';
    let dateReplacements = {};
    
    if (startDate && endDate) {
      transactionDateFilter = 'AND t.createdAt BETWEEN :startDate AND :endDate';
      applicationDateFilter = 'AND a.applicationDate BETWEEN :startDate AND :endDate';
      agentApplicationDateFilter = 'AND aa.applicationDate BETWEEN :startDate AND :endDate';
      dateReplacements = { startDate, endDate: new Date(endDate).setHours(23, 59, 59, 999) };
    } else if (startDate) {
      transactionDateFilter = 'AND t.createdAt >= :startDate';
      applicationDateFilter = 'AND a.applicationDate >= :startDate';
      agentApplicationDateFilter = 'AND aa.applicationDate >= :startDate';
      dateReplacements = { startDate };
    } else if (endDate) {
      transactionDateFilter = 'AND t.createdAt <= :endDate';
      applicationDateFilter = 'AND a.applicationDate <= :endDate';
      agentApplicationDateFilter = 'AND aa.applicationDate <= :endDate';
      dateReplacements = { endDate: new Date(endDate).setHours(23, 59, 59, 999) };
    }
    
    // Get counts for various entities with date filters
    const [
      totalMembers,
      activeMembers,
      totalAgents,
      activeAgents,
      totalDirectApplications,
      totalAgentApplications,
      totalTransactions,
      revenueStats
    ] = await Promise.all([
      // User metrics - these don't typically filter by date
      Member.count(),
      Member.count({ where: { memberStatus: 'ACTIVE' } }),
      Agent.count(),
      Agent.count({ where: { status: 'ACTIVE' } }),
      
      // Application metrics with date filter
      startDate || endDate ? 
        sequelize.query(
          `SELECT COUNT(*) as count FROM applications a WHERE 1=1 ${applicationDateFilter}`,
          { 
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT 
          }
        ).then(result => result[0].count) : 
        Application.count(),
        
      startDate || endDate ? 
        sequelize.query(
          `SELECT COUNT(*) as count FROM agent_applications aa WHERE 1=1 ${agentApplicationDateFilter}`,
          { 
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT 
          }
        ).then(result => result[0].count) : 
        AgentApplication.count(),
      
      // Transaction metrics with date filter
      startDate || endDate ? 
        sequelize.query(
          `SELECT COUNT(*) as count FROM transactions t WHERE status = 'completed' ${transactionDateFilter}`,
          { 
            replacements: dateReplacements,
            type: sequelize.QueryTypes.SELECT 
          }
        ).then(result => result[0].count) : 
        Transaction.count({ where: { status: 'completed' } }),
      
      // Revenue statistics with date filter
      sequelize.query(`
        SELECT 
          SUM(CASE WHEN t.status = 'completed' ${transactionDateFilter ? transactionDateFilter : ''} THEN t.amount ELSE 0 END) as totalRevenue,
          SUM(CASE 
              WHEN t.status = 'completed' AND t.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ${transactionDateFilter ? transactionDateFilter : ''}
              THEN t.amount ELSE 0 END) as last30DaysRevenue,
          COUNT(CASE WHEN t.status = 'completed' ${transactionDateFilter ? transactionDateFilter : ''} THEN 1 ELSE NULL END) as successfulTransactions,
          COUNT(CASE WHEN t.status != 'completed' ${transactionDateFilter ? transactionDateFilter : ''} THEN 1 ELSE NULL END) as failedTransactions
        FROM transactions t
        WHERE 1=1
        
        UNION ALL
        
        SELECT 
          SUM(CASE WHEN at.status = 'completed' ${transactionDateFilter ? transactionDateFilter.replace(/t\./g, 'at.') : ''} THEN at.amount ELSE 0 END) as totalRevenue,
          SUM(CASE 
              WHEN at.status = 'completed' AND at.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ${transactionDateFilter ? transactionDateFilter.replace(/t\./g, 'at.') : ''}
              THEN at.amount ELSE 0 END) as last30DaysRevenue,
          COUNT(CASE WHEN at.status = 'completed' ${transactionDateFilter ? transactionDateFilter.replace(/t\./g, 'at.') : ''} THEN 1 ELSE NULL END) as successfulTransactions,
          COUNT(CASE WHEN at.status != 'completed' ${transactionDateFilter ? transactionDateFilter.replace(/t\./g, 'at.') : ''} THEN 1 ELSE NULL END) as failedTransactions
        FROM agent_transactions at
        WHERE 1=1
      `, { 
        replacements: dateReplacements,
        type: sequelize.QueryTypes.SELECT 
      })
    ]);
    
    // Get recent transactions using raw query with date filter
    const recentTransactions = await sequelize.query(`
      SELECT 
        t.transactionId, 
        t.amount, 
        t.currency, 
        t.status, 
        t.createdAt,
        m.firstname, 
        m.lastname, 
        m.email
      FROM transactions t
      LEFT JOIN member_personal_information m ON t.memberId = m.memberId
      WHERE 1=1 ${transactionDateFilter}
      ORDER BY t.createdAt DESC
      LIMIT 10
    `, { 
      replacements: dateReplacements,
      type: sequelize.QueryTypes.SELECT 
    });
    
    // Get recent applications with date filter
    const recentApplications = await sequelize.query(`
      (SELECT 
        a.applicationId as id, 
        'direct' as type, 
        p.programName, 
        p.schoolName,
        CONCAT(m.firstname, ' ', m.lastname) as applicantName,
        m.email as applicantEmail,
        a.applicationStatus as status,
        a.paymentStatus,
        a.applicationDate,
        a.intake
      FROM applications a
      LEFT JOIN member_personal_information m ON a.memberId = m.memberId
      LEFT JOIN programs p ON a.programId = p.programId
      WHERE 1=1 ${applicationDateFilter}
      ORDER BY a.applicationDate DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        aa.applicationId as id, 
        'agent' as type, 
        p.programName, 
        p.schoolName,
        CONCAT(s.firstname, ' ', s.lastname) as applicantName,
        s.email as applicantEmail,
        aa.applicationStatus as status,
        aa.paymentStatus,
        aa.applicationDate,
        aa.intake
      FROM agent_applications aa
      LEFT JOIN agent_students s ON aa.memberId = s.memberId
      LEFT JOIN programs p ON aa.programId = p.programId
      WHERE 1=1 ${agentApplicationDateFilter}
      ORDER BY aa.applicationDate DESC
      LIMIT 5)
      
      ORDER BY applicationDate DESC
      LIMIT 10
    `, { 
      replacements: dateReplacements,
      type: sequelize.QueryTypes.SELECT 
    });
    
    // Get application status distribution with date filter
    let directAppStatusDistribution;
    let agentAppStatusDistribution;
    
    if (startDate || endDate) {
      directAppStatusDistribution = await sequelize.query(`
        SELECT 
          applicationStatus,
          COUNT(applicationId) as count
        FROM applications a
        WHERE 1=1 ${applicationDateFilter}
        GROUP BY applicationStatus
      `, { 
        replacements: dateReplacements,
        type: sequelize.QueryTypes.SELECT 
      });
      
      agentAppStatusDistribution = await sequelize.query(`
        SELECT 
          applicationStatus,
          COUNT(applicationId) as count
        FROM agent_applications aa
        WHERE 1=1 ${agentApplicationDateFilter}
        GROUP BY applicationStatus
      `, { 
        replacements: dateReplacements,
        type: sequelize.QueryTypes.SELECT 
      });
    } else {
      directAppStatusDistribution = await Application.findAll({
        attributes: [
          'applicationStatus',
          [sequelize.fn('COUNT', sequelize.col('applicationId')), 'count']
        ],
        group: ['applicationStatus']
      });
      
      agentAppStatusDistribution = await AgentApplication.findAll({
        attributes: [
          'applicationStatus',
          [sequelize.fn('COUNT', sequelize.col('applicationId')), 'count']
        ],
        group: ['applicationStatus']
      });
    }
    
    // Calculate total revenue
    const totalDirectRevenue = revenueStats[0]?.totalRevenue || 0;
    const totalAgentRevenue = revenueStats[1]?.totalRevenue || 0;
    const totalRevenue = parseFloat(totalDirectRevenue) + parseFloat(totalAgentRevenue);
    
    const last30DaysDirectRevenue = revenueStats[0]?.last30DaysRevenue || 0;
    const last30DaysAgentRevenue = revenueStats[1]?.last30DaysRevenue || 0;
    const last30DaysRevenue = parseFloat(last30DaysDirectRevenue) + parseFloat(last30DaysAgentRevenue);
    
    // Format the response
    const metrics = {
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      users: {
        totalMembers,
        activeMembers,
        totalAgents,
        activeAgents,
        totalUsers: totalMembers + totalAgents
      },
      applications: {
        totalApplications: parseInt(totalDirectApplications) + parseInt(totalAgentApplications),
        directApplications: parseInt(totalDirectApplications),
        agentApplications: parseInt(totalAgentApplications),
        statusDistribution: {
          direct: startDate || endDate ? 
            directAppStatusDistribution.reduce((acc, item) => {
              acc[item.applicationStatus] = parseInt(item.count);
              return acc;
            }, {}) :
            directAppStatusDistribution.reduce((acc, item) => {
              acc[item.applicationStatus] = parseInt(item.get('count'));
              return acc;
            }, {}),
          agent: startDate || endDate ?
            agentAppStatusDistribution.reduce((acc, item) => {
              acc[item.applicationStatus] = parseInt(item.count);
              return acc;
            }, {}) :
            agentAppStatusDistribution.reduce((acc, item) => {
              acc[item.applicationStatus] = parseInt(item.get('count'));
              return acc;
            }, {})
        }
      },
      revenue: {
        totalRevenue,
        last30DaysRevenue,
        successfulTransactions: 
          parseInt(revenueStats[0]?.successfulTransactions || 0) + 
          parseInt(revenueStats[1]?.successfulTransactions || 0),
        failedTransactions: 
          parseInt(revenueStats[0]?.failedTransactions || 0) + 
          parseInt(revenueStats[1]?.failedTransactions || 0)
      },
      recentActivity: {
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.transactionId,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          date: tx.createdAt,
          user: tx.firstname && tx.lastname ? `${tx.firstname} ${tx.lastname}` : 'Unknown',
          email: tx.email || 'Unknown'
        })),
        recentApplications
      }
    };
    
    return messageHandler(
      'Dashboard metrics retrieved successfully',
      true,
      200,
      metrics
    );
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve dashboard metrics',
      false,
      500
    );
  }
}; 
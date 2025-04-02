// import { Agent, AgentStudent, AgentApplication, AgentTransaction } from '../schema/associations.js';
import { Op } from 'sequelize';
import { Agent } from '../schema/AgentSchema.js';
import AgentStudent from '../schema/AgentStudentSchema.js';
import AgentApplication from '../schema/AgentApplicationSchema.js';
import AgentTransaction from '../schema/AgentTransactionSchema.js';

export const getAgentMetrics = async (agentId) => {
    try {
        // Get agent with all related data
        const agent = await Agent.findByPk(agentId, {
            include: [
                {
                    model: AgentStudent,
                    as: 'students',
                    include: [
                        {
                            model: AgentApplication,
                            as: 'applications'
                        }
                    ]
                },
                {
                    model: AgentTransaction,
                    as: 'transactions'
                }
            ]
        });

        if (!agent) {
            throw new Error('Agent not found');
        }

        // Calculate metrics
        const totalStudents = agent.students.length;
        
        const activeStudents = agent.students.filter(
            student => student.status === 'active'
        ).length;
        
        // Count applications by status
        const applications = agent.students.flatMap(
            student => student.applications || []
        );
        
        const pendingApplications = applications.filter(
            app => app.applicationStatus === 'pending'
        ).length;
        
        const approvedApplications = applications.filter(
            app => app.applicationStatus === 'approved'
        ).length;
        
        // Calculate total commission
        const totalCommission = agent.transactions.reduce(
            (total, transaction) => total + (transaction.amount || 0), 
            0
        );
        
        // Calculate monthly metrics
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        const monthlyTransactions = agent.transactions.filter(
            transaction => new Date(transaction.createdAt) >= firstDayOfMonth
        );
        
        const monthlyCommission = monthlyTransactions.reduce(
            (total, transaction) => total + (transaction.amount || 0),
            0
        );
        
        const monthlyApplications = applications.filter(
            app => new Date(app.createdAt) >= firstDayOfMonth
        ).length;

        return {
            totalStudents,
            activeStudents,
            pendingApplications,
            approvedApplications,
            totalCommission,
            monthlyCommission,
            monthlyApplications,
            // Add more metrics as needed
            conversionRate: applications.length > 0 
                ? (approvedApplications / applications.length) * 100 
                : 0,
            averageCommissionPerStudent: totalStudents > 0 
                ? totalCommission / totalStudents 
                : 0
        };
    } catch (error) {
        console.error('Error getting agent metrics:', error);
        throw error;
    }
}; 
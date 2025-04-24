import Application from './ApplicationSchema.js';
import { ApplicationDocument } from './applicationDocumentSchema.js';
import { Member } from './memberSchema.js';
import { Program } from './programSchema.js';
import { Agent } from './AgentSchema.js';
import AgentStudent from './AgentStudentSchema.js';
import AgentStudentDocument from './AgentStudentDocumentSchema.js';
import AgentApplication from './AgentApplicationSchema.js';
import AgentTransaction from './AgentTransactionSchema.js';
import Referral from './ReferralSchema.js';
import Admin from './AdminSchema.js';
import AdminMessage from './AdminMessageSchema.js';
import AdminGroup from './AdminGroupSchema.js';

// Define all associations
export const setupAssociations = () => {
    // Application associations
    Application.belongsTo(Member, { 
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'applicationMember'
    });

    Application.belongsTo(Program, {
        foreignKey: 'programId',
        targetKey: 'programId',
        as: 'program'
    });

    Application.hasMany(ApplicationDocument, {
        foreignKey: 'memberId',
        sourceKey: 'memberId',
        as: 'applicationDocuments'
    });

    ApplicationDocument.belongsTo(Application, {
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'parentApplication'
    });

    // Program associations
    Program.hasMany(Application, {
        foreignKey: 'programId',
        as: 'applications'
    });

    // Agent - AgentStudent associations
    Agent.hasMany(AgentStudent, { 
        foreignKey: 'agentId',
        as: 'students'
    });

    AgentStudent.belongsTo(Agent, { 
        foreignKey: 'agentId',
        as: 'agent'
    });

    // AgentStudent - AgentStudentDocument associations
    AgentStudent.hasMany(AgentStudentDocument, {
        foreignKey: 'memberId',
        sourceKey: 'memberId',
        as: 'documents'
    });

    AgentStudentDocument.belongsTo(AgentStudent, {
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'student'
    });

    // Agent - AgentStudentDocument associations
    Agent.hasMany(AgentStudentDocument, { 
        foreignKey: 'agentId',
        as: 'agentDocuments'
    });

    AgentStudentDocument.belongsTo(Agent, { 
        foreignKey: 'agentId',
        as: 'agent'
    });

    // AgentApplication associations
    AgentApplication.belongsTo(Agent, { 
        foreignKey: 'agentId',
        as: 'agent'
    });

    AgentApplication.belongsTo(AgentStudent, { 
        foreignKey: 'memberId',
        as: 'student'
    });

    AgentApplication.belongsTo(Program, { 
        foreignKey: 'programId',
        as: 'program'
    });

    // Agent Transaction associations
    AgentTransaction.belongsTo(AgentApplication, {
        foreignKey: 'applicationId',
        as: 'application'
    });

    AgentApplication.hasMany(AgentTransaction, {
        foreignKey: 'applicationId',
        as: 'transactions'
    });

    // Member - Referral associations (updated with unique aliases)
    Member.hasMany(Referral, {
        foreignKey: 'memberId',
        as: 'memberReferrals'
    });

    // Agent - Referral associations
    Agent.hasMany(Referral, {
        foreignKey: 'referrerId',
        as: 'agentReferrals',
        scope: {
            referrerType: 'Agent'
        }
    });

    // Referral associations
    Referral.belongsTo(Member, {
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'referredMember'
    });

    Referral.belongsTo(Agent, {
        foreignKey: 'referrerId',
        targetKey: 'agentId',
        as: 'referringAgent',
        scope: {
            referrerType: 'Agent'
        }
    });

    Referral.belongsTo(Member, {
        foreignKey: 'referrerId',
        targetKey: 'memberId',
        as: 'referringMember',
        scope: {
            referrerType: 'Member'
        }
    });

    // Member-Application association
    Member.hasMany(Application, {
        foreignKey: 'memberId',
        as: 'memberApplications'
    });
    
    // Enhanced Agent associations for metrics
    Agent.hasMany(AgentApplication, {
        foreignKey: 'agentId',
        as: 'applications'
    });
    
    Agent.hasMany(AgentTransaction, {
        foreignKey: 'agentId',
        as: 'transactions'
    });
    
    // Add direct association between Agent and AgentTransaction
    AgentTransaction.belongsTo(Agent, {
        foreignKey: 'agentId',
        as: 'agent'
    });

    // AdminMessage associations
    AdminMessage.belongsTo(Admin, {
        foreignKey: 'senderId',
        as: 'sender'
    });

    AdminMessage.belongsTo(Admin, {
        foreignKey: 'receiverId',
        as: 'receiver'
    });

    AdminMessage.belongsTo(AdminGroup, {
        foreignKey: 'groupId',
        as: 'group'
    });

    // AdminGroup associations
    AdminGroup.belongsTo(Admin, {
        foreignKey: 'createdBy',
        as: 'creator'
    });

    AdminGroup.hasMany(AdminMessage, {
        foreignKey: 'groupId',
        as: 'messages'
    });

    // Admin associations
    Admin.hasMany(AdminMessage, {
        foreignKey: 'senderId',
        as: 'sentMessages'
    });

    Admin.hasMany(AdminMessage, {
        foreignKey: 'receiverId',
        as: 'receivedMessages'
    });

    Admin.hasMany(AdminGroup, {
        foreignKey: 'createdBy',
        as: 'createdGroups'
    });
};

// Make sure we're exporting the function properly
export default setupAssociations;

// Export models with associations
export {
    Member,
    Referral,
    Agent
}; 
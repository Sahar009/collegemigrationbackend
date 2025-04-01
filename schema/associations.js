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

    Application.hasOne(ApplicationDocument, {
        foreignKey: 'memberId',
        sourceKey: 'memberId',
        as: 'applicationDocument'
    });

    // ApplicationDocument associations
    ApplicationDocument.belongsTo(Member, { 
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'documentMember'
    });

    ApplicationDocument.belongsTo(Application, {
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'application'
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
};

// Make sure we're exporting the function properly
export default setupAssociations;

// Export models with associations
export {
    Member,
    Referral,
    Agent
}; 
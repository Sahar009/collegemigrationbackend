import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import { Agent } from './AgentSchema.js';
import AgentStudent from './AgentStudentSchema.js';
import { Program } from './programSchema.js';

const AgentApplication = sequelize.define('AgentApplication', {
    applicationId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    agentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agents',
            key: 'agentId'
        }
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agent_students',
            key: 'memberId'
        }
    },
    programId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'programs',
            key: 'programId'
        }
    },
    applicationStage: {
        type: DataTypes.ENUM('documents', 'review', 'interview', 'decision', 'completed'),
        defaultValue: 'documents'
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'refunded'),
        defaultValue: 'pending'
    },
    applicationStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending'
    },
    intake: {
        type: DataTypes.STRING,
        allowNull: false
    },
    applicationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'agent_applications',
    timestamps: true
});

// Associations
AgentApplication.belongsTo(Agent, { foreignKey: 'agentId' });
AgentApplication.belongsTo(AgentStudent, { foreignKey: 'memberId' });
AgentApplication.belongsTo(Program, { foreignKey: 'programId' });

// Reverse associations
Agent.hasMany(AgentApplication, { foreignKey: 'agentId' });
AgentStudent.hasMany(AgentApplication, { foreignKey: 'memberId' });
Program.hasMany(AgentApplication, { foreignKey: 'programId' });

export default AgentApplication; 
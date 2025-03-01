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
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    paymentStatus: {
        type: DataTypes.ENUM('Unpaid', 'Paid'),
        defaultValue: 'Unpaid'
    },
    applicationStatus: {
        type: DataTypes.STRING(20),
        defaultValue: 'Pending'
    },
    intake: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    applicationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'agent_applications',
    timestamps: false
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
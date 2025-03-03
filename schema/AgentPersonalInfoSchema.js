import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import { Agent } from './AgentSchema.js';

const AgentPersonalInfo = sequelize.define('AgentPersonalInfo', {
    agentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'agents',
            key: 'agentId'
        }
    },
    othernames: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    dob: {
        type: DataTypes.DATE,
        allowNull: true
    },
    idType: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    idNumber: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    nationality: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    homeAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    homeCity: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    homeZipCode: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    homeState: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    homeCountry: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    gender: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    photo: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'agent_personal_information',
    timestamps: false
});

// Define the association
AgentPersonalInfo.belongsTo(Agent, { foreignKey: 'agentId' });
Agent.hasOne(AgentPersonalInfo, { foreignKey: 'agentId' });

export { AgentPersonalInfo }; 
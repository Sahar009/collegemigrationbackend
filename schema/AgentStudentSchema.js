import { DataTypes } from 'sequelize';
import sequelize from "../database/db.js";
import { Agent } from './AgentSchema.js';
import AgentStudentDocument  from './AgentStudentDocumentSchema.js';

const AgentStudent = sequelize.define('AgentStudent', {
    memberId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    agentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agents',
            key: 'agentId'
        }
    },
    firstname: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    lastname: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    othernames: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
     validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    gender: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    dob: {
        type: DataTypes.DATE,
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
    nationality: {
        type: DataTypes.STRING(100),
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
    idScanFront: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    idScanBack: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    photo: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    schengenVisaHolder: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    memberStatus: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active'
    },
    regDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'agent_students',
    timestamps: false,
    indexes: [
    ]
});

// Associations
AgentStudent.belongsTo(Agent, { foreignKey: 'agentId' });
Agent.hasMany(AgentStudent, { foreignKey: 'agentId' });

// Define the association in AgentStudent model
AgentStudent.hasMany(AgentStudentDocument, {
    foreignKey: 'memberId',
    sourceKey: 'memberId',
    as: 'AgentStudentDocuments'
});

export default AgentStudent; 
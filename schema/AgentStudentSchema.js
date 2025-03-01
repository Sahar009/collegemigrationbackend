import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { Member } from './memberSchema.js';

const AgentStudent = sequelize.define('AgentStudent', {
    memberId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        references: {
            model: 'member_personal_information',
            key: 'memberId'
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
        unique: true,
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
    timestamps: false
});

// Associations
AgentStudent.belongsTo(Member, { foreignKey: 'memberId' });

export default AgentStudent; 
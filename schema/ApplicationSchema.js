import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Application = sequelize.define('Application', {
    applicationId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'member_personal_information',
            key: 'memberId'
        }
    },
    programId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    programCategory: {
        type: DataTypes.ENUM('undergraduate', 'postgraduate', 'phd'),
        allowNull: false
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
    applicationStatusDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    applicationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'applications',
    timestamps: false,
    indexes: [
        {
            name: 'idx_application_member',
            fields: ['memberId']
        },
        {
            name: 'idx_application_status',
            fields: ['applicationStatus', 'paymentStatus']
        }
    ]
});

export default Application;
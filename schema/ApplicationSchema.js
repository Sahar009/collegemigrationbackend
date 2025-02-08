const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define('Application', {
    applicationId: {
        type: DataTypes.STRING,
        primaryKey: true
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
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'programs',
            key: 'programId'
        }
    },
    applicationStatus: {
        type: DataTypes.ENUM('Pending', 'Processing', 'Approved', 'Rejected'),
        defaultValue: 'Pending'
    },
    applicationStatusDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    paymentStatus: {
        type: DataTypes.ENUM('Unpaid', 'Paid'),
        defaultValue: 'Unpaid'
    },
    paymentDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    applicationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'applications',
    timestamps: false
});

module.exports = Application;
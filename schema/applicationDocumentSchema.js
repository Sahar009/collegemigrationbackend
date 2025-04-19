import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

export const ApplicationDocument = sequelize.define('ApplicationDocument', {
    documentId: {
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
    agentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'member_agents',
            key: 'agentId'
        }
    },
    documentType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    documentPath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uploadDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    adminComment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    reviewedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'adminId'
        }
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'application_documents',
    timestamps: true
});

export default ApplicationDocument; 
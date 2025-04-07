import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const AgentStudentDocument = sequelize.define('AgentStudentDocument', {
    documentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    agentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    documentType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    documentPath: {
        type: DataTypes.STRING,
        allowNull: false
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
            model: 'admins',
            key: 'adminId'
        }
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    uploadDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'agent_student_documents',
    timestamps: true
});

export default AgentStudentDocument; 
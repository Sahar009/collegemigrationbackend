import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import Admin from './AdminSchema.js';

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    activity: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Description of the activity performed'
    },
    details: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON details about the activity or changes made'
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of the admin who performed the action',
        references: {
            model: 'Admins',
            key: 'id'
        }
    },
    entityType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Type of entity that was affected (e.g., application, member, agent)'
    },
    entityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID of the entity that was affected'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'activity_logs',
    timestamps: true
});

// Define relationships
ActivityLog.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

export { ActivityLog }; 
import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const AdminMessage = sequelize.define('AdminMessage', {
    messageId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admin_users',
            key: 'adminId'
        }
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'adminId'
        }
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_groups',
            key: 'groupId'
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    readBy: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    isGroupMessage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'admin_messages',
    timestamps: true
});

export default AdminMessage; 
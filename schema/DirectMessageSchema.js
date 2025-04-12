import { DataTypes } from "sequelize";
import sequelize from "../database/db.js";

export const DirectMessage = sequelize.define('DirectMessage', {
    messageId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    senderType: {
        type: DataTypes.ENUM('admin', 'agent', 'member'),
        allowNull: false,
        validate: {
            isIn: [['admin', 'agent', 'member']]
        }
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    receiverType: {
        type: DataTypes.ENUM('admin', 'user', 'agent', 'member', 'student'),
        allowNull: false,
        validate: {
            isIn: [['admin', 'user', 'agent', 'member', 'student']]
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of file paths {name: string, path: string}'
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'direct_messages',
    timestamps: true,
    indexes: [
        {
            fields: ['senderId', 'receiverId']
        }
    ]
}); 
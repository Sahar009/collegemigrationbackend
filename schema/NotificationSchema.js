import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID of the user (member or agent)'
    },
    userType: {
        type: DataTypes.ENUM('member', 'agent', 'admin'),
        allowNull: false,
        comment: 'Type of user receiving the notification'
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Notification category (e.g., application, payment, system)'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to redirect when notification is clicked'
    },
    status: {
        type: DataTypes.ENUM('read', 'unread'),
        defaultValue: 'unread'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Higher number means higher priority'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional data related to the notification'
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

export default Notification;
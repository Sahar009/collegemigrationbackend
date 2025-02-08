const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordReset = sequelize.define('PasswordReset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'member_personal_information',
            key: 'email'
        }
    },
    otpValue: {
        type: DataTypes.STRING,
        allowNull: false
    },
    otpStatus: {
        type: DataTypes.ENUM('valid', 'invalid'),
        defaultValue: 'valid'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'password_otp',
    timestamps: false
});

module.exports = PasswordReset;
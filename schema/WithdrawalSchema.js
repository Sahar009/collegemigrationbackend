import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Withdrawal = sequelize.define('Withdrawal', {
    withdrawalId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userType: {
        type: DataTypes.ENUM('Member', 'Agent'),
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    accountName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    accountNumber: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    bankName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending'
    }
}, {
    tableName: 'withdrawals',
    timestamps: true
});

export default Withdrawal;
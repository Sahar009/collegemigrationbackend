import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const WalletTransaction = sequelize.define('WalletTransaction', {
    transactionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    walletId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('commission', 'refund', 'withdrawal'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Completed'),
        defaultValue: 'Pending'
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'wallet_transactions',
    timestamps: true
});

export default WalletTransaction; 
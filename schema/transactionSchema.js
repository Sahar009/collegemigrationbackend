import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

export const Transaction = sequelize.define('Transaction', {
    transactionId: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'applications',
            key: 'applicationId'
        }
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'NGN'),
        allowNull: false
    },
    amountInUSD: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount converted to USD for reporting'
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    paymentProvider: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    paymentReference: {
        type: DataTypes.STRING,
        unique: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'transactions'
}); 
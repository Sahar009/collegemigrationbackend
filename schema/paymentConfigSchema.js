import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

export const PaymentConfig = sequelize.define('PaymentConfig', {
    configId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    currency: {
        type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'NGN'),
        allowNull: false
    },
    symbol: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    exchangeRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Exchange rate relative to USD'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    paymentMethods: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Available payment methods for this currency'
    }
}, {
    timestamps: true,
    tableName: 'payment_configs'
}); 
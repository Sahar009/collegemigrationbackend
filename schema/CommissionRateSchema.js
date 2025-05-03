import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const CommissionRate = sequelize.define('CommissionRate', {
    rateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userType: {
        type: DataTypes.ENUM('Agent', 'Member'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD',
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'commission_rates'
});

export default CommissionRate;
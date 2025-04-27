import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const TuitionPayment = sequelize.define('TuitionPayment', {
    paymentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
        allowNull: false,
        references: {
            model: 'member_personal_information',
            key: 'memberId'
        }
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
        allowNull: false
    },
    paymentReference: {
        type: DataTypes.STRING,
        unique: true
    },
    transactionId: {
        type: DataTypes.STRING,
        references: {
            model: 'transactions',
            key: 'transactionId'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    paymentProvider: {
        type: DataTypes.STRING,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    },
    paymentDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'tuition_payments',
    timestamps: true,
    indexes: [
        {
            name: 'idx_tuition_application',
            fields: ['applicationId']
        },
        {
            name: 'idx_tuition_member',
            fields: ['memberId']
        },
        {
            name: 'idx_tuition_status',
            fields: ['status']
        }
    ]
});

export default TuitionPayment; 
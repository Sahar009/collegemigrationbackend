import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const AgentTransaction = sequelize.define('AgentTransaction', {
    transactionId: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    agentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agents',
            key: 'agentId'
        }
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'agent_applications',
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
        type: DataTypes.STRING(3),
        allowNull: false
    },
    amountInUSD: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    paymentReference: {
        type: DataTypes.STRING,
        unique: true
    },
    metadata: {
        type: DataTypes.JSON,
        defaultValue: {}
    }
}, {
    tableName: 'agent_transactions',
    timestamps: true
});

export default AgentTransaction; 
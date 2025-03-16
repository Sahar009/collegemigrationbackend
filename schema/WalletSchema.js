import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Wallet = sequelize.define('Wallet', {
    walletId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userType: {
        type: DataTypes.ENUM('Member', 'Agent'),
        allowNull: false
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    }
}, {
    tableName: 'wallets',
    timestamps: true
});

export default Wallet; 
import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Referral = sequelize.define('Referral', {
    referralId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'referralId'
    },
    referralCode: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'referralCode'
    },
    referrerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'referrerId'
    },
    referrerType: {
        type: DataTypes.ENUM('Agent', 'Member'),
        allowNull: false,
        field: 'referrerType'
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'memberId',
        references: {
            model: 'member_personal_information',
            key: 'memberId'
        }
    },
    status: {
        type: DataTypes.ENUM('unpaid', 'paid'),
        defaultValue: 'unpaid',
        field: 'status'
    },
    statusDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'statusDate'
    }
}, {
    tableName: 'referrals',
    timestamps: true,
    underscored: false
});

// Note: We're not defining associations here anymore
// They will be defined in associations.js to keep everything centralized

export default Referral; 
import { DataTypes } from 'sequelize';
import sequelize from "../database/db.js";
import { Member } from './memberSchema.js';

const Referral = sequelize.define('Referral', {
    rId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ref: {
        type: DataTypes.ENUM('Member', 'Agent'),
        allowNull: false
    },
    refId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'member_personal_information',
            key: 'memberId'
        }
    },
    refStatus: {
        type: DataTypes.ENUM('paid', 'unpaid'),
        defaultValue: 'unpaid'
    },
    refDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    refStatusDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'referrals',
    timestamps: false
});

// Add association
Referral.belongsTo(Member, { foreignKey: 'memberId' });

export default Referral; 
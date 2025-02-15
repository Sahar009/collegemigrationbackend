import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import { Member } from './memberSchema.js';

const EducationalQualification = sequelize.define('EducationalQualification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'member_personal_information',
            key: 'memberId'
        }
    },
    institutionName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    institutionLocation: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    certificate: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    certificateType: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    certificateDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    certificateDoc: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    otherInfo: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    uploadDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'member_educational_qualification',
    timestamps: false
});

EducationalQualification.belongsTo(Member, { foreignKey: 'memberId' }); 
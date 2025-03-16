import { DataTypes } from "sequelize";
import sequelize from "../database/db.js";
import Referral from "./ReferralSchema.js";

export const Member = sequelize.define('Member', {
    memberId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    firstname: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    lastname: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    othernames: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true
    },
    dob: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    homeAddress: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    homeCity: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    homeZipCode: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    homeState: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    homeCountry: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    idType: {
        type: DataTypes.ENUM('passport', 'national_id', 'drivers_license'),
        allowNull: true
    },
    idNumber: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    idScanFront: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    idScanBack: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    nationality: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    schengenVisaHolder: {
        type: DataTypes.ENUM('yes', 'no', 'pending'),
        allowNull: true
    },
    photo: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    memberStatus: {
        type: DataTypes.ENUM('PENDING', 'ACTIVE', 'SUSPENDED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    regDate: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: () => new Date().toISOString()
    },
    resetCode: {
        type: DataTypes.STRING(4),
        allowNull: true
    },
    resetCodeExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    referralCode: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    }
}, {
    timestamps: true,
    tableName: 'member_personal_information',
    hooks: {
        beforeCreate: (member) => {
            // Set registration date if not provided
            if (!member.regDate) {
                member.regDate = new Date().toISOString();
            }
        }
    },
    indexes: [
        {
            name: 'idx_member_search',
            fields: ['firstname', 'lastname', 'email']
        },
        {
            name: 'idx_member_location',
            fields: ['homeCountry', 'homeState']
        },
        {
            name: 'idx_member_referral',
            fields: ['referralCode']
        }
    ]
});

// Add associations
Member.hasMany(Referral, {
    foreignKey: 'memberId',
    as: 'referrals'
});

export default Member; 
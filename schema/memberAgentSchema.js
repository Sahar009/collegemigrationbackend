import { DataTypes } from "sequelize";
import sequelize from "../database/db.js";


export const MemberAgent = sequelize.define('MemberAgent', {
    agentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true
    },
    photo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    businessName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    agentStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING'
    },
    regDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'member_agent'
});


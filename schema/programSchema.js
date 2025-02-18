import { DataTypes } from "sequelize";
import sequelize from "../database/db.js";

export const Program = sequelize.define('Program', {
    programId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    programName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    degree: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    degreeLevel: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('undergraduate', 'postgraduate', 'phd'),
        allowNull: false
    },
    schoolName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    language: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    semesters: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    fee: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    about: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    features: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    schoolLogo: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    programImage: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    applicationFee: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    applicationDeadline: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'programs'
}); 
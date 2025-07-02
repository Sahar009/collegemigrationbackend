import { DataTypes } from "sequelize";
import sequelize from "../database/db.js";
import { School } from "./schoolSchema.js";

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
        type: DataTypes.ENUM(
            'undergraduate', 
            'postgraduate', 
            'phd',
            '1-Year Certificate',
            '2-Year Diploma',
            '3-Year Advanced Diploma',
            '3-Year Bachelor',
            'Top-up Degree',
            '4-Year Bachelor',
            'Integrated Masters',
            'Postgraduate Certificate',
            'Postgraduate Diploma',
            'Masters Degree',
            'Doctoral/PhD',
            'Non-Credential'
        ),
        allowNull: false
    },
    schoolId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'schools',
            key: 'schoolId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    feeCurrency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD'
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
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    timestamps: false,
    tableName: 'programs',
    // Optimize for read performance
    defaultScope: {
        attributes: {
            exclude: ['about', 'features'] // Exclude large text fields by default
        }
    }
});

// Define association
Program.belongsTo(School, { foreignKey: 'schoolId' });
School.hasMany(Program, { foreignKey: 'schoolId' });
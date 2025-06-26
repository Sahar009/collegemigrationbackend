import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

export const AppConfig = sequelize.define('AppConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'app_configs',
    timestamps: true
});

export default AppConfig;

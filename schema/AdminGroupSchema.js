import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const AdminGroup = sequelize.define('AdminGroup', {
    groupId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    groupName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ''
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admin_users',
            key: 'adminId'
        }
    },
    members: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
            isArray(value) {
                if (!Array.isArray(value)) {
                    throw new Error('Members must be an array');
                }
            }
        }
    }
}, {
    tableName: 'admin_groups',
    timestamps: true
});

export default AdminGroup; 
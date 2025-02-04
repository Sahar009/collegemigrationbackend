import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Force production mode when using Clever Cloud database
const isProduction = true; // or process.env.NODE_ENV === 'production'

export const config = {
    server: {
        port: process.env.PORT || 5000
    },
    database: {
        name: process.env.MYSQL_ADDON_DB,
        user: process.env.MYSQL_ADDON_USER,
        password: process.env.MYSQL_ADDON_PASSWORD,
        host: process.env.MYSQL_ADDON_HOST,
        port: process.env.MYSQL_ADDON_PORT || 3306,
        url: process.env.MYSQL_ADDON_URI
    },
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306
    },
    test: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306
    }
};

// // Log connection details (without sensitive info)
// console.log('Database Configuration:', {
//     host: config.database.host,
//     port: config.database.port,
//     name: config.database.name,
//     user: config.database.user
// });



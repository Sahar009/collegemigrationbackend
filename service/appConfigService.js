import { AppConfig } from '../schema/appConfigSchema.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';
import { messageHandler } from '../utils/index.js';

// Default configuration values
const DEFAULT_CONFIGS = {
    'require_document_validation': 'true',
};

// Initialize default configurations if they don't exist
const initializeDefaultConfigs = async () => {
    try {
        for (const [key, value] of Object.entries(DEFAULT_CONFIGS)) {
            await AppConfig.findOrCreate({
                where: { key },
                defaults: { value, description: `Auto-generated default for ${key}` }
            });
        }
    } catch (error) {
        console.error('Error initializing default configs:', error);
    }
};

export const getConfig = async (key) => {
    try {
        const config = await AppConfig.findOne({ where: { key } });
        if (!config) {
            // If config doesn't exist, create it with default value
            if (key in DEFAULT_CONFIGS) {
                await AppConfig.create({
                    key,
                    value: DEFAULT_CONFIGS[key],
                    description: `Auto-created config for ${key}`
                });
                return DEFAULT_CONFIGS[key] === 'true';
            }
            return null;
        }
        return config.value === 'true';
    } catch (error) {
        console.error('Error getting config:', error);
        return key in DEFAULT_CONFIGS ? DEFAULT_CONFIGS[key] === 'true' : null;
    }
};

export const setConfig = async (key, value, description = '') => {
    try {
        const [config] = await AppConfig.upsert({
            key,
            value: String(value),
            description: description || `Configuration for ${key}`
        });
        return config;
    } catch (error) {
        console.error('Error setting config:', error);
        throw error;
    }
};

export const getAllConfigs = async (callback) => {
    try {
        await initializeDefaultConfigs();
        const configs = await AppConfig.findAll();
        
        // Convert to object with boolean values
        const configObj = {};
        configs.forEach(config => {
            configObj[config.key] = config.value === 'true';
        });

        // Include any default configs that might be missing
        Object.entries(DEFAULT_CONFIGS).forEach(([key, value]) => {
            if (!(key in configObj)) {
                configObj[key] = value === 'true';
            }
        });

        return callback(messageHandler(
            'Configuration retrieved successfully',
            true,
            SUCCESS,
            configObj
        ));
    } catch (error) {
        console.error('Error getting configurations:', error);
        return callback(messageHandler(
            'Failed to retrieve configurations',
            false,
            BAD_REQUEST
        ));
    }
};

export const updateConfigs = async (configUpdates, callback) => {
    try {
        const updates = [];
        
        for (const [key, value] of Object.entries(configUpdates)) {
            updates.push(
                AppConfig.update(
                    { value: String(value) },
                    { where: { key } }
                )
            );
        }

        await Promise.all(updates);
        
        return callback(messageHandler(
            'Configurations updated successfully',
            true,
            SUCCESS
        ));
    } catch (error) {
        console.error('Error updating configurations:', error);
        return callback(messageHandler(
            'Failed to update configurations',
            false,
            BAD_REQUEST
        ));
    }
};

// Initialize default configs when the service is imported
initializeDefaultConfigs();

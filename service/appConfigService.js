import { AppConfig } from '../schema/appConfigSchema.js';
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
                return messageHandler(
                    'Config retrieved successfully',
                    true,
                    200,
                    { [key]: DEFAULT_CONFIGS[key] === 'true' }
                );
            }
            return messageHandler('Config not found', false, 404);
        }
        return {
            message: 'Config retrieved successfully',
            success: true,
            statusCode: 200,
            data: { [key]: config.value === 'true' }
        };
    } catch (error) {
        console.error('Error getting config:', error);
        console.error('Error in getConfig:', error);
        return {
            message: error.message || 'Failed to retrieve config',
            success: false,
            statusCode: error.status || 500,
            error: error.message
        };
    }
};

export const setConfig = async (key, value, description = '') => {
    try {
        const [config] = await AppConfig.upsert({
            key,
            value: String(value),
            description: description || `Configuration for ${key}`
        });
        
        return {
            message: 'Config updated successfully',
            success: true,
            statusCode: 200,
            data: { [key]: config[0]?.value === 'true' }
        };
    } catch (error) {
        console.error('Error setting config:', error);
        console.error('Error in setConfig:', error);
        return messageHandler(
            error.message || 'Failed to update config',
            false,
            error.status || 500, // Default to 500 if no status provided
            { error: error.message }
        );
    }
};

export const getAllConfigs = async () => {
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

        return {
            message: 'Configurations retrieved successfully',
            success: true,
            statusCode: 200,
            data: configObj
        };
    } catch (error) {
        console.error('Error getting configurations:', error);
        console.error('Error in getAllConfigs:', error);
        return messageHandler(
            error.message || 'Failed to retrieve configurations',
            false,
            error.status || 500, // Default to 500 if no status provided
            { error: error.message }
        );
    }
};

export const updateConfigs = async (configUpdates) => {
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
        
        // Get updated configs
        const updatedConfigs = await AppConfig.findAll({
            where: { key: Object.keys(configUpdates) }
        });

        const result = {};
        updatedConfigs.forEach(config => {
            result[config.key] = config.value === 'true';
        });

        return {
            message: 'Configurations updated successfully',
            success: true,
            statusCode: 200,
            data: result
        };
    } catch (error) {
        console.error('Error updating configurations:', error);
        console.error('Error in updateConfigs:', error);
        return messageHandler(
            error.message || 'Failed to update configurations',
            false,
            error.status || 500, // Default to 500 if no status provided
            { error: error.message }
        );
    }
};

// Initialize default configs when the service is imported
initializeDefaultConfigs();

import redis from '../config/redisConfig.js';

// Cache duration in seconds (e.g., 1 hour)
const CACHE_DURATION = 3600;

// Generate cache key based on query parameters
export const generateCacheKey = (query) => {
    const {
        search = '',
        degreeLevel = '',
        language = '',
        location = '',
        limit = 10,
        page = 1
    } = query;

    return `programs:${search}:${degreeLevel}:${language}:${location}:${limit}:${page}`;
};

// Set cache with expiration
export const setCache = async (key, data) => {
    try {
        // Ensure data is properly stringified
        const stringifiedData = JSON.stringify(data);
        await redis.set(key, stringifiedData, {
            ex: CACHE_DURATION
        });
    } catch (error) {
        console.error('Cache set error:', error);
    }
};

// Get cache
export const getCache = async (key) => {
    try {
        const cachedData = await redis.get(key);
        // Only parse if cachedData is a string
        if (typeof cachedData === 'string') {
            return JSON.parse(cachedData);
        }
        return null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
};

// Clear cache by pattern
export const clearCache = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Cache clear error:', error);
    }
}; 
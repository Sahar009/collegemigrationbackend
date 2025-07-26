import redis from '../config/redisConfig.js';

// Cache TTL in seconds
const CACHE_TTL = {
    SHORT: 300,       // 5 minutes for frequently changing data
    MEDIUM: 3600,     // 1 hour for moderately changing data
    LONG: 86400,      // 24 hours for stable data
    DEFAULT: 1800     // 30 minutes default
};

// Check if Redis is available
const isRedisAvailable = async () => {
    try {
        await redis.ping();
        return true;
    } catch (error) {
        console.warn('⚠️ Redis not available, running in no-cache mode');
        return false;
    }
};

// Generate cache key for programs with pagination and filters
export const generateProgramsCacheKey = (query = {}) => {
    const { 
        page = 1, 
        limit = 12, 
        search = '',
        category = '',
        degreeLevel = '',
        location = ''
    } = query;
    
    // Create a consistent key format
    const keyParts = [
        'programs',
        `p:${page}`,
        `l:${limit}`,
        search ? `s:${search.replace(/\s+/g, '_').toLowerCase()}` : 's:none',
        category ? `c:${category}` : 'c:all',
        degreeLevel ? `d:${degreeLevel}` : 'd:all',
        location ? `loc:${location.replace(/\s+/g, '_').toLowerCase()}` : 'loc:all'
    ];
    
    return keyParts.join(':');
};

// Optimize program data for caching
const optimizeProgramForCache = (programs) => {
    if (!Array.isArray(programs)) return programs;
    
    return programs.map(program => {
        const optimized = {
            programId: program.programId,
            programName: program.programName,
            degree: program.degree,
            degreeLevel: program.degreeLevel,
            category: program.category,
            schoolId: program.schoolId,
            schoolName: program.schoolName,
            language: program.language,
            semesters: program.semesters,
            fee: program.fee,
            feeCurrency: program.feeCurrency,
            location: program.location,
            schoolLogo: program.schoolLogo,
            programImage: program.programImage,
            applicationFee: program.applicationFee,
            isActive: program.isActive
        };

        // Include School object if it exists
        if (program.School) {
            optimized.School = {
                schoolId: program.School.schoolId,
                schoolName: program.School.schoolName,
                logo: program.School.logo,
                applicationDeadline: program.School.applicationDeadline
            };
        }

        return optimized;
    });
};

// Restore program data from cache
const restoreProgramFromCache = (cachedData) => {
    if (!Array.isArray(cachedData)) return cachedData;
    
    return cachedData.map(item => ({
        programId: item.programId,
        programName: item.programName,
        degree: item.degree,
        degreeLevel: item.degreeLevel,
        category: item.category,
        schoolId: item.schoolId,
        schoolName: item.schoolName,
        language: item.language,
        semesters: item.semesters,
        fee: item.fee,
        feeCurrency: item.feeCurrency,
        location: item.location,
        schoolLogo: item.schoolLogo,
        programImage: item.programImage,
        applicationFee: item.applicationFee,
        isActive: item.isActive,
        School: item.School ? {
            schoolId: item.School.schoolId,
            schoolName: item.School.schoolName,
            logo: item.School.logo,
            applicationDeadline: item.School.applicationDeadline
        } : null
    }));
};

// Set cache with optimized data
export const setCache = async (key, data, ttl = CACHE_TTL.DEFAULT) => {
    if (!(await isRedisAvailable())) return false;
    
    try {
        // Optimize data before storing
        const dataToCache = Array.isArray(data.programs)
            ? { ...data, programs: optimizeProgramForCache(data.programs) }
            : data;
            
        const result = await redis.set(key, JSON.stringify(dataToCache), { ex: ttl });
        return result === 'OK';
    } catch (error) {
        console.error('Cache set error:', error.message);
        return false;
    }
};

// Get cache with data restoration
export const getCache = async (key) => {
    if (!(await isRedisAvailable())) return null;
    
    try {
        const cachedData = await Promise.race([
            redis.get(key),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis timeout')), 300) // Shorter timeout
            )
        ]);
        
        if (!cachedData) return null;
        
        const parsedData = typeof cachedData === 'string' 
            ? JSON.parse(cachedData)
            : cachedData;
            
        // Restore data if it contains programs array
        return Array.isArray(parsedData.programs)
            ? { ...parsedData, programs: restoreProgramFromCache(parsedData.programs) }
            : parsedData;
            
    } catch (error) {
        console.error('Cache get error:', error.message);
        return null;
    }
};

// Clear cache by pattern with batching for large key sets
export const clearCache = async (pattern, batchSize = 100) => {
    if (!(await isRedisAvailable())) return false;
    
    try {
        const keys = await redis.keys(pattern);
        if (!keys || keys.length === 0) return true;
        
        // Process in batches to avoid blocking Redis
        for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await Promise.race([
                redis.del(...batch),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Redis delete timeout')), 1000)
                )
            ]);
        }
        return true;
    } catch (error) {
        console.error('Cache clear error:', error.message);
        return false;
    }
};

// Invalidate all program-related caches
export const invalidateProgramsCache = async (programId = null) => {
    try {
        if (programId) {
            // Invalidate specific program cache
            await clearCache(`program:${programId}*`);
        }
        // Invalidate all programs list caches
        await clearCache('programs:*');
        return true;
    } catch (error) {
        console.error('Cache invalidation error:', error);
        return false;
    }
};

// Check if Redis is available
export const isCacheAvailable = isRedisAvailable;

// Export TTL constants
export { CACHE_TTL };
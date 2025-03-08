import { Program } from '../schema/programSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import { Op } from 'sequelize';
import { generateCacheKey, setCache, getCache, clearCache } from '../utils/cache.js';

// Create Program Service
export const createProgramService = async (data, callback) => {
    try {
        const newProgram = await Program.create({
            programName: data.programName,
            degree: data.degree,
            degreeLevel: data.degreeLevel,
            schoolName: data.schoolName,
            language: data.language,
            semesters: data.semesters,
            fee: data.fee,
            location: data.location,
            about: data.about || null,
            category: data.category,
            features: data.features || null,
            schoolLogo: data.schoolLogo || null,
            programImage: data.programImage || null,
            applicationFee: data.applicationFee,
            applicationDeadline: data.applicationDeadline
        });
        
        // Clear all program caches when a new program is created
        await clearCache('programs:*');

        return callback(messageHandler(
            "Program created successfully", 
            true, 
            SUCCESS, 
            newProgram
        ));

    } catch (error) {
        console.error('Create program error:', error);
        return callback(messageHandler(
            "An error occurred while creating program", 
            false, 
            BAD_REQUEST
        ));
    }
};  

// Get All Programs Service with search, filter and caching
export const getAllProgramsService = async (query, callback) => {
    try {
        // Generate cache key based on query parameters
        const cacheKey = generateCacheKey(query);
        
        // Try to get data from cache
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return callback(
                messageHandler("Programs retrieved from cache", true, SUCCESS, cachedData)
            );
        }
        
        console.log(`Cache miss for key: ${cacheKey}`);

        const { 
            search, 
            degreeLevel, 
            language, 
            location,
            limit = 10,
            page = 1,
            category,
            countries
        } = query;

        // Build where clause
        const whereClause = {};
        
        // Add search functionality
        if (search) {
            whereClause[Op.or] = [
                { programName: { [Op.like]: `%${search}%` } },
                { degree: { [Op.like]: `%${search}%` } },
                { schoolName: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } }
            ];
        }

        // Add filters
        if (degreeLevel) whereClause.degreeLevel = degreeLevel;
        if (language) whereClause.language = language;
        if (location) whereClause.location = location;
        if (category) whereClause.category = category;
        if (countries) whereClause.location = { [Op.like]: `%${countries}%` };

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Get programs with pagination
        const { count, rows: programs } = await Program.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Calculate total pages
        const totalPages = Math.ceil(count / limit);

        const responseData = {
            programs: programs.length ? programs : [],
            pagination: {
                total: count,
                totalPages,
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        };

        // Cache the response (use environment variable for expiration)
        const expiration = parseInt(process.env.REDIS_CACHE_EXPIRATION || 86400);
        await setCache(cacheKey, responseData, expiration);

        return callback(
            messageHandler(
                programs.length ? "Programs retrieved successfully" : "No programs found",
                true,
                SUCCESS,
                responseData
            )
        );

    } catch (error) {
        console.error('Get programs error:', error);
        return callback(
            messageHandler("An error occurred while fetching programs", false, BAD_REQUEST)
        );
    }
};

// Get Single Program Service with caching
export const getProgramByIdService = async (programId, callback) => {
    try {
        // Try to get from cache first
        const cacheKey = `program:${programId}`;
        const cachedProgram = await getCache(cacheKey);
        
        if (cachedProgram) {
            return callback(
                messageHandler("Program retrieved from cache", true, SUCCESS, cachedProgram)
            );
        }

        const program = await Program.findByPk(programId);

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // Cache the program
        await setCache(cacheKey, program);

        return callback(
            messageHandler("Program retrieved successfully", true, SUCCESS, program)
        );

    } catch (error) {
        console.error('Get program error:', error);
        return callback(
            messageHandler("An error occurred while fetching program", false, BAD_REQUEST)
        );
    }
};

// Update Program Service
export const updateProgramService = async (programId, data, callback) => {
    try {
        const program = await Program.findByPk(programId);

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // Update program
        await program.update(data);
        
        // Clear specific program cache and all programs cache
        await clearCache(`program:${programId}`);
        await clearCache('programs:*');

        return callback(
            messageHandler("Program updated successfully", true, SUCCESS, program)
        );

    } catch (error) {
        console.error('Update program error:', error);
        return callback(
            messageHandler("An error occurred while updating program", false, BAD_REQUEST)
        );
    }
};

// Delete Program Service
export const deleteProgramService = async (programId, callback) => {
    try {
        const program = await Program.findByPk(programId);

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // Delete program
        await program.destroy();
        
        // Clear specific program cache and all programs cache
        await clearCache(`program:${programId}`);
        await clearCache('programs:*');

        return callback(
            messageHandler("Program deleted successfully", true, SUCCESS)
        );

    } catch (error) {
        console.error('Delete program error:', error);
        return callback(
            messageHandler("An error occurred while deleting program", false, BAD_REQUEST)
        );
    }
};

// Search Programs Service with caching
export const searchProgramsService = async (query, callback) => {
    try {
        // Generate cache key for search
        const cacheKey = `programs:search:${query}`;
        
        // Try to get from cache
        const cachedResults = await getCache(cacheKey);
        if (cachedResults) {
            return callback(
                messageHandler("Search results retrieved from cache", true, SUCCESS, cachedResults)
            );
        }

        const programs = await Program.findAll({
            where: {
                [Op.or]: [
                    { programName: { [Op.like]: `%${query}%` } },
                    { degree: { [Op.like]: `%${query}%` } },
                    { schoolName: { [Op.like]: `%${query}%` } },
                    { location: { [Op.like]: `%${query}%` } }
                ]
            }
        });

        // Cache the search results
        await setCache(cacheKey, programs);

        return callback(
            messageHandler("Search results retrieved successfully", true, SUCCESS, programs)
        );

    } catch (error) {
        console.error('Search programs error:', error);
        return callback(
            messageHandler("An error occurred while searching programs", false, BAD_REQUEST)
        );
    }
};

// Filter Programs Service with caching
export const filterProgramsService = async (filters, callback) => {
    try {
        // Generate cache key for filters
        const filterKey = JSON.stringify(filters);
        const cacheKey = `programs:filter:${filterKey}`;
        
        // Try to get from cache
        const cachedResults = await getCache(cacheKey);
        if (cachedResults) {
            return callback(
                messageHandler("Filtered programs retrieved from cache", true, SUCCESS, cachedResults)
            );
        }

        const whereClause = {};
        
        // Add filters to where clause
        if (filters.degreeLevel) whereClause.degreeLevel = filters.degreeLevel;
        if (filters.language) whereClause.language = filters.language;
        if (filters.location) whereClause.location = filters.location;

        const programs = await Program.findAll({
            where: whereClause,
        });

        // Cache the filtered results
        await setCache(cacheKey, programs);

        return callback(
            messageHandler("Filtered programs retrieved successfully", true, SUCCESS, programs)
        );

    } catch (error) {
        console.error('Filter programs error:', error);
        return callback(
            messageHandler("An error occurred while filtering programs", false, BAD_REQUEST)
        );
    }
}; 
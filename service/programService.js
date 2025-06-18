import { Program } from '../schema/programSchema.js';
import { School } from '../schema/schoolSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import { Op } from 'sequelize';
import { generateCacheKey, setCache, getCache, clearCache } from '../utils/cache.js';

// Create Program Service
export const createProgramService = async (data, callback) => {
    try {
        // Validate category
        const validCategories = [
            'undergraduate', 'postgraduate', 'phd',
            '1-Year Certificate', '2-Year Diploma', '3-Year Advanced Diploma',
            '3-Year Bachelor', 'Top-up Degree', '4-Year Bachelor',
            'Integrated Masters', 'Postgraduate Certificate', 'Postgraduate Diploma',
            'Masters Degree', 'Doctoral/PhD', 'Non-Credential'
        ];
        
        if (!validCategories.includes(data.category)) {
            return callback(messageHandler("Invalid program category", false, BAD_REQUEST));
        }
        
        const newProgram = await Program.create({
            programName: data.programName,
            degree: data.degree,
            degreeLevel: data.degreeLevel,
            schoolName: data.schoolName,
            language: data.language,
            semesters: data.semesters,
            fee: data.fee,
            feeCurrency: data.feeCurrency || 'USD',
            location: data.location,
            about: data.about || null,
            category: data.category,
            features: data.features || null,
            schoolLogo: data.schoolLogo || null,
            programImage: data.programImage || null,
            applicationFee: data.applicationFee
        });
        
        // Clear ALL program-related caches
        await Promise.all([
            clearCache('programs:*'),      // Clear all paginated program lists
            clearCache('programs:search:*'), // Clear all search results
            clearCache('programs:filter:*')  // Clear all filter results
        ]);

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
            countries,
            isActive
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

        // Add isActive filter if specified
        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true' || isActive === true;
        }

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Get programs with pagination and include school's application deadline
        const { count, rows: programs } = await Program.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{
                model: School,
                as: 'school',
                attributes: ['applicationDeadline']
            }]
        });

        // Map programs to include applicationDeadline from school
        const programsWithDeadline = programs.map(program => ({
            ...program.toJSON(),
            applicationDeadline: program.school?.applicationDeadline || null
        }));

        // Calculate total pages
        const totalPages = Math.ceil(count / limit);

        const responseData = {
            programs: programsWithDeadline,
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

        const program = await Program.findByPk(programId, {
            include: [{
                model: School,
                as: 'school',
                attributes: ['applicationDeadline']
            }]
        });

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // Add applicationDeadline from school to program data
        const programData = program.toJSON();
        programData.applicationDeadline = program.school?.applicationDeadline || null;

        // Cache the program with school's application deadline
        await setCache(cacheKey, programData);
        
        return callback(
            messageHandler("Program retrieved successfully", true, SUCCESS, programData)
        );

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
        
        // Clear ALL program-related caches
        await Promise.all([
            clearCache(`program:${programId}`),  // Clear specific program
            clearCache('programs:*'),            // Clear all program lists
            clearCache('programs:search:*'),     // Clear all search results
            clearCache('programs:filter:*')      // Clear all filter results
        ]);

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
        
        // Clear ALL program-related caches
        await Promise.all([
            clearCache(`program:${programId}`),  // Clear specific program
            clearCache('programs:*'),            // Clear all program lists
            clearCache('programs:search:*'),     // Clear all search results
            clearCache('programs:filter:*')      // Clear all filter results
        ]);

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

// Toggle Program Status Service (activate/deactivate)
export const toggleProgramStatusService = async (programId, status, callback) => {
    try {
        const program = await Program.findByPk(programId);

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // Update status
        await program.update({ isActive: status });
        
        // Clear ALL program-related caches
        await Promise.all([
            clearCache(`program:${programId}`),  // Clear specific program
            clearCache('programs:*'),            // Clear all program lists
            clearCache('programs:search:*'),     // Clear all search results
            clearCache('programs:filter:*')      // Clear all filter results
        ]);

        const statusMessage = status ? "activated" : "deactivated";
        return callback(
            messageHandler(`Program ${statusMessage} successfully`, true, SUCCESS, program)
        );
    } catch (error) {
        console.error('Toggle program status error:', error);
        return callback(
            messageHandler("An error occurred while updating program status", false, BAD_REQUEST)
        );
    }
}; 
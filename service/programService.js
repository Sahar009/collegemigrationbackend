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
        
        // Check if school exists
        const school = await School.findByPk(data.schoolId);
        if (!school) {
            return callback(messageHandler("School not found", false, NOT_FOUND));
        }

        const newProgram = await Program.create({
            programName: data.programName,
            degree: data.degree,
            degreeLevel: data.degreeLevel,
            schoolId: data.schoolId,
            schoolName: school.schoolName, // Keep for backward compatibility
            language: data.language,
            semesters: data.semesters,
            fee: data.fee,
            feeCurrency: data.feeCurrency || 'USD',
            location: data.location,
            about: data.about || null,
            category: data.category,
            features: data.features || null,
            schoolLogo: school.logo || data.schoolLogo || null,
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
            return callback(
                messageHandler("Programs retrieved from cache", true, SUCCESS, cachedData)
            );
        }

        // Destructure query parameters with defaults
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
        
        // Validate pagination parameters
        const pageSize = Math.min(parseInt(limit, 10) || 10, 100); // Max 100 items per page
        const pageNumber = Math.max(1, parseInt(page, 10) || 1);
        const offset = (pageNumber - 1) * pageSize;

        // Build where clause with optimized conditions
        const whereClause = {};
        
        // Add search functionality with optimized conditions
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            whereClause[Op.or] = [
                { programName: { [Op.like]: searchTerm } },
                { degree: { [Op.like]: searchTerm } },
                { schoolName: { [Op.like]: searchTerm } },
                { location: { [Op.like]: searchTerm } }
            ];
        }

        // Add filters with type checking
        if (degreeLevel) whereClause.degreeLevel = degreeLevel;
        if (language) whereClause.language = language;
        if (location) whereClause.location = location;
        if (category) whereClause.category = category;
        if (countries) whereClause.location = { [Op.like]: `%${countries}%` };
        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true' || isActive === true;
        }

        // Get total count and paginated results in a single query
        const { count, rows: programs } = await Program.findAndCountAll({
            where: whereClause,
            limit: pageSize,
            offset,
            include: [{
                model: School,
                attributes: ['applicationDeadline'],
                required: false // Use LEFT JOIN instead of INNER JOIN
            }],
            order: [
                ['isActive', 'DESC'],  // Active programs first
                ['programName', 'ASC'] // Then sort by name
            ],
            benchmark: true, // Log query execution time
            logging: (sql, timingMs) => {
                if (timingMs > 200) { // Log slow queries
                    console.warn(`Slow query (${timingMs}ms): ${sql}`);
                }
            },
            // Explicitly select only the fields we need
            attributes: [
                'programId', 'programName', 'degree', 'degreeLevel', 'category',
                'schoolId', 'schoolName', 'language', 'semesters', 'fee',
                'feeCurrency', 'location', 'schoolLogo', 'programImage',
                'applicationFee', 'isActive'
            ]
        });

        // Prepare response data with optimized structure
        const responseData = {
            programs: programs.map(program => ({
                ...program.get({ plain: true }), // Convert to plain object
                applicationDeadline: program.school?.applicationDeadline || null
            })),
            pagination: {
                total: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: pageNumber,
                limit: pageSize
            }
        };

        // Cache the response with appropriate TTL
        const cacheTTL = process.env.NODE_ENV === 'production' ? 
            parseInt(process.env.REDIS_CACHE_EXPIRATION || 3600, 10) : // 1 hour in production
            60; // 1 minute in development
            
        await setCache(cacheKey, responseData, cacheTTL);

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
                attributes: ['schoolId', 'schoolName', 'country', 'city', 'logo', 'website', 'email', 'phone', 'applicationDeadline', 'description']
            }]
        });

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // Cache the program with school details
        const programData = program.toJSON();
        await setCache(cacheKey, programData);
        
        return callback(
            messageHandler("Program retrieved successfully", true, SUCCESS, programData)
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
    const t = await Program.sequelize.transaction();
    
    try {
        const program = await Program.findByPk(programId, { transaction: t });
        
        if (!program) {
            await t.rollback();
            return callback(messageHandler("Program not found", false, NOT_FOUND));
        }

        // If schoolId is being updated, validate the new school
        if (data.schoolId && data.schoolId !== program.schoolId) {
            const school = await School.findByPk(data.schoolId, { transaction: t });
            if (!school) {
                await t.rollback();
                return callback(messageHandler("School not found", false, NOT_FOUND));
            }
            // Update schoolName to match the new school
            data.schoolName = school.schoolName;
            // Update logo if not explicitly set
            if (!data.schoolLogo) {
                data.schoolLogo = school.logo || null;
            }
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
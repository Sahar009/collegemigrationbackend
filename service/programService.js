import { Program } from '../schema/programSchema.js';
import { School } from '../schema/schoolSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import { Op, literal } from 'sequelize';
import { 
    setCache, 
    getCache, 
    clearCache, 
    generateProgramsCacheKey, 
    invalidateProgramsCache,
    CACHE_TTL 
} from '../utils/cache.js';

// Cache TTL in seconds
const CACHE_CONFIG = {
    LIST: CACHE_TTL.MEDIUM,      // 1 hour for program lists
    DETAILS: CACHE_TTL.LONG,     // 24 hours for program details
    SEARCH: CACHE_TTL.SHORT,     // 5 minutes for search results
    DEFAULT: CACHE_TTL.DEFAULT   // 30 minutes default
};

// Default pagination
const DEFAULT_PAGINATION = {
    page: 1,
    limit: 12,
    maxLimit: 100
};

// Base program attributes to select
const PROGRAM_ATTRIBUTES = [
    'programId', 'programName', 'degree', 'degreeLevel', 'category',
    'schoolId', 'schoolName', 'language', 'semesters', 'fee',
    'feeCurrency', 'location', 'schoolLogo', 'programImage',
    'applicationFee', 'isActive'
];

// School include configuration
const SCHOOL_INCLUDE = {
    model: School,
    attributes: ['schoolId', 'schoolName', 'logo', 'applicationDeadline'],
    required: false
};

/**
 * Builds where clause for program queries
 */
const buildProgramsWhereClause = (query = {}) => {
    const { 
        search = '',
        category = '',
        degreeLevel = '',
        location = '',
        schoolId = '',
        isActive = true
    } = query;
    
    // Convert isActive to boolean if it's a string
    let isActiveValue = isActive;
    if (typeof isActive === 'string') {
        isActiveValue = isActive === 'true';
    }
    const whereClause = { isActive: isActiveValue };
    
    // Add search conditions
    if (search) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        whereClause[Op.or] = [
            literal(`LOWER(programName) LIKE '${searchTerm.replace(/'/g, '\'')}'`),
            literal(`LOWER(Program.schoolName) LIKE '${searchTerm.replace(/'/g, '\'')}'`)
        ];
    }
    
    // Add filter conditions
    if (category) whereClause.category = category;
    if (degreeLevel) whereClause.degreeLevel = degreeLevel;
    if (location) {
        // Handle multiple countries in location filter
        const countries = location.split(',').map(c => c.trim());
        if (countries.length > 1) {
            whereClause[Op.or] = countries.map(country => ({
                location: { [Op.like]: `%${country}%` }
            }));
        } else {
            whereClause.location = { [Op.like]: `%${location}%` };
        }
    }
    if (schoolId) whereClause.schoolId = schoolId;
    
    // Debug logging
    console.log('Query:', query);
    console.log('Where clause:', whereClause);
    
    return whereClause;
};

/**
 * Builds options for program queries
 */
const buildProgramsQueryOptions = (query = {}) => {
    const { page = DEFAULT_PAGINATION.page, limit = DEFAULT_PAGINATION.limit } = query;
    
    // Ensure limit doesn't exceed maximum
    const safeLimit = Math.min(
        parseInt(limit, 10) || DEFAULT_PAGINATION.limit, 
        DEFAULT_PAGINATION.maxLimit
    );
    
    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * safeLimit;
    
    return {
        attributes: PROGRAM_ATTRIBUTES,
        include: [SCHOOL_INCLUDE],
        where: buildProgramsWhereClause(query),
        limit: safeLimit,
        offset,
        raw: true,
        nest: true,
        // Disable logging for production
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    };
};

/**
 * Gets pagination metadata
 */
const getPaginationMetadata = (total, page, limit) => {
    const safeLimit = Math.min(limit, DEFAULT_PAGINATION.maxLimit);
    const safePage = Math.max(1, page);
    const totalPages = Math.ceil(total / safeLimit);
    
    return {
        totalItems: total,
        totalPages,
        currentPage: safePage,
        itemsPerPage: safeLimit,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1
    };
};

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

/**
 * Get All Programs Service with optimized caching and pagination
 */
export const getAllProgramsService = async (query, callback) => {
    const startTime = Date.now();
    const cacheKey = generateProgramsCacheKey(query);
    const cacheTTL = query.search ? CACHE_CONFIG.SEARCH : CACHE_CONFIG.LIST;
    
    try {
        // If countries param is present, use it as location
        if (query.countries) {
            query.location = query.countries;
        }
        // 1. Try to get from cache first
        const cachedResult = await getCache(cacheKey);
        if (cachedResult) {
            const responseTime = Date.now() - startTime;
            return callback(
                messageHandler("Programs retrieved from cache", true, SUCCESS, {
                    ...cachedResult,
                    meta: {
                        ...cachedResult.meta,
                        cache: 'HIT',
                        responseTime: `${responseTime}ms`
                    }
                })
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

        // 2. Build query options and execute database queries in parallel
        const queryOptions = buildProgramsQueryOptions(query);
        const [total, programs] = await Promise.all([
            // Get total count with minimal fields
            Program.count({ 
                where: queryOptions.where,
                distinct: true,
                col: 'programId',
                logging: queryOptions.logging
            }),
            
            // Get paginated program data
            Program.findAll(queryOptions)
        ]);
        
        // 3. Format the response
        const pagination = getPaginationMetadata(
            total,
            parseInt(query.page, 10) || DEFAULT_PAGINATION.page,
            parseInt(query.limit, 10) || DEFAULT_PAGINATION.limit
        );
        
        // Format programs data for response
        const formattedPrograms = programs.map(program => ({
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
            isActive: program.isActive,
            School: program.School ? {
                schoolId: program.School.schoolId,
                schoolName: program.School.schoolName,
                logo: program.School.logo,
                applicationDeadline: program.School.applicationDeadline
            } : null
        }));
        
        const response = {
            programs: formattedPrograms,
            meta: {
                ...pagination,
                cache: 'MISS',
                responseTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            }
        };
        
        // 4. Cache the result asynchronously without blocking the response
        setCache(cacheKey, response, cacheTTL)
            .then(success => {
                if (success) {
                    console.log(`✅ Cached programs list (${formattedPrograms.length} items)`);
                }
            })
            .catch(err => console.error('Error caching programs:', err));
            
        return callback(
            messageHandler("Programs retrieved successfully", true, SUCCESS, response)
        );
        // The response is already prepared and returned above
        // No additional code needed here

    } catch (error) {
        console.error('Get programs error:', error);
        return callback(
            messageHandler("An error occurred while fetching programs", false, BAD_REQUEST)
        );
    }
};

/**
 * Get Single Program Service with optimized caching
 */
export const getProgramByIdService = async (programId, callback) => {
    const startTime = Date.now();
    const cacheKey = `program:${programId}`;
    
    try {
        // 1. Try to get from cache first
        const cachedProgram = await getCache(cacheKey);
        if (cachedProgram) {
            const responseTime = Date.now() - startTime;
            return callback(
                messageHandler("Program retrieved from cache", true, SUCCESS, {
                    ...cachedProgram,
                    meta: {
                        cache: 'HIT',
                        responseTime: `${responseTime}ms`,
                        timestamp: new Date().toISOString()
                    }
                })
            );
        }

        // 2. If not in cache, fetch from database
        const program = await Program.findByPk(programId, {
            include: [{
                model: School,
                attributes: [
                    'schoolId', 'schoolName', 'country', 'city', 'logo', 
                    'website', 'email', 'phone', 'applicationDeadline', 'description'
                ]
            }],
            raw: true,
            nest: true
        });

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // 3. Prepare response with metadata
        const response = {
            ...program,
            meta: {
                cache: 'MISS',
                responseTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            }
        };

        // 4. Cache the program asynchronously without blocking the response
        setCache(cacheKey, response, CACHE_CONFIG.DETAILS)
            .then(success => {
                if (success) {
                    console.log(`✅ Cached program details for ID: ${programId}`);
                }
            })
            .catch(err => console.error('Error caching program:', err));
        
        return callback(
            messageHandler("Program retrieved successfully", true, SUCCESS, response)
        );

    } catch (error) {
        console.error('Get program error:', error);
        return callback(
            messageHandler("An error occurred while fetching program", false, BAD_REQUEST)
        );
    }
};

/**
 * Update Program Service with cache invalidation
 */
export const updateProgramService = async (programId, data, callback) => {
    const t = await Program.sequelize.transaction();
    
    try {
        // 1. Find the existing program
        const program = await Program.findByPk(programId, { 
            transaction: t,
            raw: true,
            nest: true
        });
        
        if (!program) {
            await t.rollback();
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // 2. If schoolId is being updated, validate the new school
        if (data.schoolId && data.schoolId !== program.schoolId) {
            const school = await School.findByPk(data.schoolId, { 
                attributes: ['schoolName'],
                transaction: t 
            });
            
            if (!school) {
                await t.rollback();
                return callback(
                    messageHandler("School not found", false, NOT_FOUND)
                );
            }
            // Update schoolName to match the new school
            data.schoolName = school.schoolName;
        }

        // 3. Update the program
        const [updatedCount] = await Program.update(data, {
            where: { programId },
            transaction: t
        });

        if (updatedCount === 0) {
            await t.rollback();
            return callback(
                messageHandler("Failed to update program", false, BAD_REQUEST)
            );
        }

        // 4. Invalidate cache for this program and program lists
        await Promise.all([
            clearCache(`program:${programId}`),
            clearCache('programs:*')
        ]).catch(err => {
            console.error('Cache invalidation error:', err);
            // Don't fail the request if cache invalidation fails
        });

        // 5. Commit the transaction
        await t.commit();

        // 6. Get the updated program with all its relationships
        const updatedProgram = await Program.findByPk(programId, {
            include: [{
                model: School,
                attributes: [
                    'schoolId', 'schoolName', 'country', 'city', 'logo', 
                    'website', 'email', 'phone', 'applicationDeadline', 'description'
                ]
            }],
            raw: true,
            nest: true
        });

        // 7. Cache the updated program
        setCache(`program:${programId}`, updatedProgram, CACHE_CONFIG.DETAILS)
            .catch(err => console.error('Error caching updated program:', err));

        return callback(
            messageHandler("Program updated successfully", true, SUCCESS, updatedProgram)
        );

    } catch (error) {
        await t.rollback();
        console.error('Update program error:', error);
        return callback(
            messageHandler("An error occurred while updating program", false, BAD_REQUEST)
        );
    }
};

/**
 * Delete Program Service with cache invalidation
 */
export const deleteProgramService = async (programId, callback) => {
    const t = await Program.sequelize.transaction();
    
    try {
        // 1. Find the program to delete
        const program = await Program.findByPk(programId, { 
            transaction: t,
            raw: true
        });
        
        if (!program) {
            await t.rollback();
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

        // 2. Soft delete by setting isActive to false
        const [updatedCount] = await Program.update(
            { isActive: false },
            { 
                where: { programId },
                transaction: t
            }
        );

        if (updatedCount === 0) {
            await t.rollback();
            return callback(
                messageHandler("Failed to delete program", false, BAD_REQUEST)
            );
        }

        // 3. Invalidate cache for this program and program lists
        await Promise.all([
            clearCache(`program:${programId}`),
            clearCache('programs:*')
        ]).catch(err => {
            console.error('Cache invalidation error:', err);
            // Don't fail the request if cache invalidation fails
        });

        // 4. Commit the transaction
        await t.commit();
        
        return callback(
            messageHandler("Program deleted successfully", true, SUCCESS)
        );

    } catch (error) {
        await t.rollback();
        console.error('Delete program error:', error);
        return callback(
            messageHandler("An error occurred while deleting program", false, BAD_REQUEST)
        );
    }
};

/**
 * Search Programs Service with optimized caching and proper column names
 */
export const searchProgramsService = async (searchQuery, callback) => {
    const startTime = Date.now();
    
    try {
        if (!searchQuery || searchQuery.trim() === '') {
            return callback(
                messageHandler("Search query is required", false, BAD_REQUEST)
            );
        }

        // Generate cache key for search
        const cacheKey = `programs:search:${searchQuery.toLowerCase().trim()}`;
        
        // 1. Try to get from cache first
        const cachedResults = await getCache(cacheKey);
        if (cachedResults) {
            const responseTime = Date.now() - startTime;
            return callback(
                messageHandler("Search results from cache", true, SUCCESS, {
                    ...cachedResults,
                    meta: {
                        ...cachedResults.meta,
                        cache: 'HIT',
                        responseTime: `${responseTime}ms`
                    }
                })
            );
        }

        // 2. Build search conditions
        const searchTerm = `%${searchQuery.trim()}%`;
        const whereClause = {
            [Op.and]: [
                { isActive: true },
                {
                    [Op.or]: [
                        { programName: { [Op.iLike]: searchTerm } },
                        { degree: { [Op.iLike]: searchTerm } },
                        { schoolName: { [Op.iLike]: searchTerm } },
                        { location: { [Op.iLike]: searchTerm } },
                        { '$school.schoolName$': { [Op.iLike]: searchTerm } },
                        { '$school.country$': { [Op.iLike]: searchTerm } },
                        { '$school.city$': { [Op.iLike]: searchTerm } }
                    ]
                }
            ]
        };

        // 3. Execute search query
        const [total, programs] = await Promise.all([
            Program.count({
                where: whereClause,
                include: [{
                    model: School,
                    attributes: [],
                    required: false
                }],
                distinct: true,
                col: 'programId'
            }),
            
            Program.findAll({
                attributes: PROGRAM_ATTRIBUTES,
                include: [{
                    ...SCHOOL_INCLUDE,
                    attributes: ['schoolId', 'schoolName', 'logo', 'applicationDeadline']
                }],
                where: whereClause,
                order: [['programName', 'ASC']],
                raw: true,
                nest: true
            })
        ]);

        // 4. Prepare response with metadata
        const response = {
            programs,
            meta: {
                totalItems: total,
                cache: 'MISS',
                searchQuery: searchQuery,
                responseTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            }
        };

        // 5. Cache the results asynchronously
        setCache(cacheKey, response, CACHE_CONFIG.SEARCH)
            .then(success => {
                if (success) {
                    console.log(`✅ Cached search results for: ${searchQuery}`);
                }
            })
            .catch(err => console.error('Error caching search results:', err));
        
        return callback(
            messageHandler("Search completed successfully", true, SUCCESS, response)
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
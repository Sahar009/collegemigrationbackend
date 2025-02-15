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
            features: data.features || null,
            schoolLogo: data.schoolLogo || null,
            programImage: data.programImage || null,
            applicationFee: data.applicationFee,
            applicationDeadline: data.applicationDeadline
        });
        
        // Clear all program caches
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

// Get All Programs Service with search and filter
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

        const { 
            search, 
            degreeLevel, 
            language, 
            location,
            limit = 10,
            page = 1
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

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Get programs with pagination
        const { count, rows: programs } = await Program.findAndCountAll({
            where: whereClause,
            order: [['programId', 'DESC']],
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

        // Cache the response
        await setCache(cacheKey, responseData);

        if (!programs.length) {
            return callback(
                messageHandler("No programs found", true, SUCCESS, responseData)
            );
        }

        return callback(
            messageHandler(
                "Programs retrieved successfully",
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

// Get Single Program Service
export const getProgramByIdService = async (programId, callback) => {
    try {
        const program = await Program.findByPk(programId);

        if (!program) {
            return callback(
                messageHandler("Program not found", false, NOT_FOUND)
            );
        }

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
        
        // Clear all program caches
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
        
        // Clear all program caches
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

// Search Programs Service
export const searchProgramsService = async (query, callback) => {
    try {
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

// Filter Programs Service
export const filterProgramsService = async (filters, callback) => {
    try {
        const whereClause = {};
        
        // Add filters to where clause
        if (filters.degreeLevel) whereClause.degreeLevel = filters.degreeLevel;
        if (filters.language) whereClause.language = filters.language;
        if (filters.location) whereClause.location = filters.location;

        const programs = await Program.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

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
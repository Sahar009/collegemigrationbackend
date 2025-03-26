import { Program } from '../schema/programSchema.js';
import { School } from '../schema/schoolSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';
import { Op } from 'sequelize';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

// Get all programs with filtering and pagination
export const getAllProgramsService = async (query) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      schoolId,
      degree,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { programName: { [Op.like]: `%${search}%` } },
        { schoolName: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (schoolId) {
      whereConditions.schoolId = schoolId;
    }
    
    if (degree) {
      whereConditions.degree = degree;
    }
    
    if (status) {
      whereConditions.isActive = status === 'active';
    }
    
    const { count, rows: programs } = await Program.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]]
    });
    
    return messageHandler(
      'Programs retrieved successfully',
      true,
      200,
      {
        programs,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          pageSize: parseInt(limit)
        }
      }
    );
  } catch (error) {
    console.error('Get all programs error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve programs',
      false,
      500
    );
  }
};

// Get program by ID
export const getProgramByIdService = async (programId) => {
  try {
    const program = await Program.findByPk(programId);
    
    if (!program) {
      return messageHandler('Program not found', false, 404);
    }
    
    return messageHandler(
      'Program retrieved successfully',
      true,
      200,
      program
    );
  } catch (error) {
    console.error('Get program by ID error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve program',
      false,
      500
    );
  }
};

// Create new program
export const createProgramService = async (programData) => {
  const t = await sequelize.transaction();
  
  try {
    // Check if school exists
    const school = await School.findByPk(programData.schoolId, { transaction: t });
    
    if (!school) {
      await t.rollback();
      return messageHandler('School not found', false, 404);
    }
    
    // Create program
    const program = await Program.create({
      ...programData,
      schoolName: school.schoolName,
      isActive: true
    }, { transaction: t });
    
    await t.commit();
    
    return messageHandler(
      'Program created successfully',
      true,
      201,
      program
    );
  } catch (error) {
    await t.rollback();
    console.error('Create program error:', error);
    return messageHandler(
      error.message || 'Failed to create program',
      false,
      500
    );
  }
};

// Update program
export const updateProgramService = async (programId, updateData) => {
  const t = await sequelize.transaction();
  
  try {
    const program = await Program.findByPk(programId, { transaction: t });
    
    if (!program) {
      await t.rollback();
      return messageHandler('Program not found', false, 404);
    }
    
    // If schoolId is being updated, check if the new school exists
    if (updateData.schoolId && updateData.schoolId !== program.schoolId) {
      const school = await School.findByPk(updateData.schoolId, { transaction: t });
      
      if (!school) {
        await t.rollback();
        return messageHandler('School not found', false, 404);
      }
      
      // Update schoolName to match the new school
      updateData.schoolName = school.schoolName;
    }
    
    await program.update(updateData, { transaction: t });
    
    await t.commit();
    
    return messageHandler(
      'Program updated successfully',
      true,
      200,
      program
    );
  } catch (error) {
    await t.rollback();
    console.error('Update program error:', error);
    return messageHandler(
      error.message || 'Failed to update program',
      false,
      500
    );
  }
};

// Toggle program status (activate/deactivate)
export const toggleProgramStatusService = async (programId) => {
  const t = await sequelize.transaction();
  
  try {
    const program = await Program.findByPk(programId, { transaction: t });
    
    if (!program) {
      await t.rollback();
      return messageHandler('Program not found', false, 404);
    }
    
    await program.update({
      isActive: !program.isActive
    }, { transaction: t });
    
    await t.commit();
    
    return messageHandler(
      `Program ${program.isActive ? 'activated' : 'deactivated'} successfully`,
      true,
      200,
      program
    );
  } catch (error) {
    await t.rollback();
    console.error('Toggle program status error:', error);
    return messageHandler(
      error.message || 'Failed to update program status',
      false,
      500
    );
  }
};

// Import programs from CSV
export const importProgramsFromCSVService = async (filePath) => {
  const t = await sequelize.transaction();
  
  try {
    const programs = [];
    const errors = [];
    let rowCount = 0;
    
    // Process CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          rowCount++;
          
          // Validate required fields
          if (!row.programName || !row.schoolId || !row.degree) {
            errors.push(`Row ${rowCount}: Missing required fields (programName, schoolId, degree)`);
            return;
          }
          
          // Check if school exists
          const school = await School.findByPk(row.schoolId, { transaction: t });
          
          if (!school) {
            errors.push(`Row ${rowCount}: School with ID ${row.schoolId} not found`);
            return;
          }
          
          // Prepare program data
          const programData = {
            programName: row.programName,
            schoolId: row.schoolId,
            schoolName: school.schoolName,
            degree: row.degree,
            degreeLevel: row.degreeLevel || null,
            language: row.language || 'English',
            semesters: row.semesters || null,
            fee: row.fee || 0,
            applicationFee: row.applicationFee || 0,
            location: row.location || null,
            about: row.about || null,
            features: row.features || null,
            applicationDeadline: row.applicationDeadline || null,
            isActive: row.isActive === 'true' || row.isActive === '1' || true
          };
          
          programs.push(programData);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // If there are errors, rollback and return them
    if (errors.length > 0) {
      await t.rollback();
      return messageHandler(
        'CSV import completed with errors',
        false,
        400,
        { errors }
      );
    }
    
    // Bulk create programs
    const createdPrograms = await Program.bulkCreate(programs, { transaction: t });
    
    await t.commit();
    
    // Delete the temporary file
    fs.unlinkSync(filePath);
    
    return messageHandler(
      'Programs imported successfully',
      true,
      201,
      {
        importedCount: createdPrograms.length,
        programs: createdPrograms
      }
    );
  } catch (error) {
    await t.rollback();
    console.error('Import programs error:', error);
    
    // Delete the temporary file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return messageHandler(
      error.message || 'Failed to import programs',
      false,
      500
    );
  }
}; 
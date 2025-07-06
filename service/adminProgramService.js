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
      include: [
        {
          model: School,
          attributes: ['schoolId', 'schoolName', 'country', 'city', 'logo']
        }
      ],
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
    const program = await Program.findByPk(programId, {
      include: [
        {
          model: School,
          attributes: ['schoolId', 'schoolName', 'country', 'city', 'logo', 'description', 'website', 'applicationDeadline']
        }
      ]
    });
    
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
  const transaction = await sequelize.transaction();
  
  try {
    // First check if the school exists
    const school = await School.findByPk(programData.schoolId);
    if (!school) {
      await transaction.rollback();
      return messageHandler('School not found', false, 404);
    }
    
    // Set school name from the school record
    programData.schoolName = school.schoolName;
    
    const program = await Program.create(programData, { transaction });
    await transaction.commit();
    
    // Fetch the created program with school details
    const createdProgram = await Program.findByPk(program.programId, {
      include: [
        {
          model: School,
          attributes: ['schoolId', 'schoolName', 'country', 'city', 'logo']
        }
      ]
    });
    
    return messageHandler(
      'Program created successfully',
      true,
      201,
      createdProgram
    );
  } catch (error) {
    await transaction.rollback();
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
    
    // If schoolId is being updated, verify the new school exists
    if (updateData.schoolId && updateData.schoolId !== program.schoolId) {
      const school = await School.findByPk(updateData.schoolId, { transaction: t });
      if (!school) {
        await t.rollback();
        return messageHandler('School not found', false, 404);
      }
      // Update school name when schoolId changes
      updateData.schoolName = school.schoolName;
    }
    
    await program.update(updateData, { transaction: t });
    
    // Fetch the updated program with school details
    const updatedProgram = await Program.findByPk(programId, {
      include: [
        {
          model: School,
          attributes: ['schoolId', 'schoolName', 'country', 'city', 'logo']
        }
      ],
      transaction: t
    });
    
    await t.commit();
    
    return messageHandler(
      'Program updated successfully',
      true,
      200,
      updatedProgram
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
    
    // Read the entire file first
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = await new Promise((resolve, reject) => {
      const results = [];
      const parser = csv()
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
      
      parser.write(fileContent);
      parser.end();
    });

    // Process each row sequentially
    for (const [index, row] of rows.entries()) {
      rowCount = index + 1;
      
      // Validate required fields
      if (!row.programName || !row.schoolId || !row.degree || !row.category) {
        errors.push(`Row ${rowCount}: Missing required fields (programName, schoolId, degree, category)`);
        continue;
      }

      // Validate category
      const validCategories = [
        'undergraduate', 'postgraduate', 'phd', '1-Year Certificate',
        '2-Year Diploma', '3-Year Advanced Diploma', '3-Year Bachelor',
        'Top-up Degree', '4-Year Bachelor', 'Integrated Masters',
        'Postgraduate Certificate', 'Postgraduate Diploma',
        'Masters Degree', 'Doctoral/PhD', 'Non-Credential'
      ];
      
      if (!validCategories.includes(row.category)) {
        errors.push(`Row ${rowCount}: Invalid category. Must be one of: ${validCategories.join(', ')}`);
        continue;
      }
      
      // Check if school exists
      const school = await School.findByPk(row.schoolId, { transaction: t });
      
      if (!school) {
        const errorMsg = `Row ${rowCount}: School with ID ${row.schoolId} not found`;
        console.error(errorMsg);
        errors.push(errorMsg);
        continue;
      }
      
      // Prepare program data
      const programData = {
        programName: row.programName,
        schoolId: row.schoolId,
        schoolName: school.schoolName,
        degree: row.degree,
        degreeLevel: row.degreeLevel || row.degree, // Fallback to degree if degreeLevel not provided
        category: row.category,
        language: row.language || 'English',
        semesters: row.semesters || '2', // Default to 2 semesters if not provided
        fee: parseFloat(row.fee) || 0,
        feeCurrency: row.feeCurrency || 'USD',
        location: row.location || school.location || 'Not specified',
        about: row.about || `${row.programName} program at ${school.schoolName}`,
        features: row.features || null,
        applicationFee: parseFloat(row.applicationFee) || 0,
        applicationDeadline: row.applicationDeadline || null,
        isActive: row.isActive === 'true' || row.isActive === '1' || true
      };
      
      programs.push(programData);
    }
    
  
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
    const createdPrograms = await Program.bulkCreate(programs, { 
      transaction: t,
      returning: true,
      validate: true
    });
    
    await t.commit();
    
    // Delete the temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
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

// Helper function to build export filters
const buildExportFilters = (query) => {
  const { 
    search = '',
    schoolId,
    degree,
    status
  } = query;
  
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
  
  return whereConditions;
};

export const exportProgramsService = async (query) => {
  try {

    // Test database connection first
    try {
      await sequelize.authenticate();
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return messageHandler('Database connection failed', false, 500);
    }
    
    const whereConditions = buildExportFilters(query);
    console.log('Built where conditions:', JSON.stringify(whereConditions, null, 2));
    
    // Check total programs without filters first
    const totalPrograms = await Program.count();
    console.log(`Total programs in database: ${totalPrograms}`);
    
    if (totalPrograms === 0) {
      console.log('No programs found in database at all');
      return messageHandler('No programs found in database', false, 404);
    }
    
    // Now try with filters
    const programs = await Program.findAll({
      where: whereConditions,
      raw: true
    });

    console.log(`Found ${programs.length} programs to export with filters`);
    
    if (programs.length === 0) {
      console.log('No programs match the current filters, but programs exist in database');
      return messageHandler('No programs found to export with current filters', false, 404);
    }

    // Create CSV headers based on import structure
    const headers = [
      'programName', 'schoolId', 'degree', 'degreeLevel', 'category',
      'language', 'semesters', 'fee', 'applicationFee',
      'location', 'about', 'features', 'isActive'
    ];



    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    programs.forEach((program, index) => {
      console.log(`Processing program ${index + 1}:`, program.programName);
      const row = headers.map(header => {
        let value = program[header] || '';
        
        // Handle special formatting
        if (header === 'isActive') {
          value = program.isActive ? 'true' : 'false';
        }
        
        // Escape commas and wrap in quotes if needed
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
      
      csvContent += row + '\n';
    });

    return messageHandler(
      'Programs exported successfully',
      true,
      200,
      {
        csvData: csvContent,
        filename: `programs-export-${Date.now()}.csv`,
        count: programs.length
      }
    );

  } catch (error) {
    console.error('Export programs error:', error);
    return messageHandler(
      error.message || 'Failed to export programs',
      false,
      500
    );
  }
}; 
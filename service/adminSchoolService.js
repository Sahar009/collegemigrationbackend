import { School } from '../schema/schoolSchema.js';
import { Program } from '../schema/programSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';
import { Op } from 'sequelize';
import fs from 'fs';
import csv from 'csv-parser';

// Get all schools with filtering and pagination
export const getAllSchoolsService = async (query) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      country,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { schoolName: { [Op.like]: `%${search}%` } },
        { country: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (country) {
      whereConditions.country = country;
    }
    
    if (status) {
      whereConditions.isActive = status === 'active';
    }
    
    const { count, rows: schools } = await School.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]]
    });
    
    return messageHandler(
      'Schools retrieved successfully',
      true,
      200,
      {
        schools,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          pageSize: parseInt(limit)
        }
      }
    );
  } catch (error) {
    console.error('Get all schools error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve schools',
      false,
      500
    );
  }
};

// Get school by ID
export const getSchoolByIdService = async (schoolId) => {
  try {
    const school = await School.findByPk(schoolId);
    
    if (!school) {
      return messageHandler('School not found', false, 404);
    }
    
    // Get program count for this school
    const programCount = await Program.count({
      where: { schoolId }
    });
    
    const schoolData = school.toJSON();
    schoolData.programCount = programCount;
    
    return messageHandler(
      'School retrieved successfully',
      true,
      200,
      schoolData
    );
  } catch (error) {
    console.error('Get school by ID error:', error);
    return messageHandler(
      error.message || 'Failed to retrieve school',
      false,
      500
    );
  }
};

// Create new school
export const createSchoolService = async (schoolData) => {
  const t = await sequelize.transaction();
  
  try {
    // Create school
    const school = await School.create({
      ...schoolData,
      isActive: true
    }, { transaction: t });
    
    await t.commit();
    
    return messageHandler(
      'School created successfully',
      true,
      201,
      school
    );
  } catch (error) {
    await t.rollback();
    console.error('Create school error:', error);
    return messageHandler(
      error.message || 'Failed to create school',
      false,
      500
    );
  }
};

// Update school
export const updateSchoolService = async (schoolId, updateData) => {
  const t = await sequelize.transaction();
  
  try {
    const school = await School.findByPk(schoolId, { transaction: t });
    
    if (!school) {
      await t.rollback();
      return messageHandler('School not found', false, 404);
    }
    
    await school.update(updateData, { transaction: t });
    
    // If school name is updated, update all programs with this school
    if (updateData.schoolName && updateData.schoolName !== school.schoolName) {
      await Program.update(
        { schoolName: updateData.schoolName },
        { 
          where: { schoolId },
          transaction: t 
        }
      );
    }
    
    await t.commit();
    
    return messageHandler(
      'School updated successfully',
      true,
      200,
      school
    );
  } catch (error) {
    await t.rollback();
    console.error('Update school error:', error);
    return messageHandler(
      error.message || 'Failed to update school',
      false,
      500
    );
  }
};

// Toggle school status (activate/deactivate)
export const toggleSchoolStatusService = async (schoolId) => {
  const t = await sequelize.transaction();
  
  try {
    const school = await School.findByPk(schoolId, { transaction: t });
    
    if (!school) {
      await t.rollback();
      return messageHandler('School not found', false, 404);
    }
    
    await school.update({
      isActive: !school.isActive
    }, { transaction: t });
    
    await t.commit();
    
    return messageHandler(
      `School ${school.isActive ? 'activated' : 'deactivated'} successfully`,
      true,
      200,
      school
    );
  } catch (error) {
    await t.rollback();
    console.error('Toggle school status error:', error);
    return messageHandler(
      error.message || 'Failed to update school status',
      false,
      500
    );
  }
};

// Import schools from CSV
export const importSchoolsFromCSVService = async (filePath) => {
  const t = await sequelize.transaction();
  
  try {
    const schools = [];
    const errors = [];
    let rowCount = 0;
    
    // Process CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Validate required fields
          if (!row.schoolName || !row.country) {
            errors.push(`Row ${rowCount}: Missing required fields (schoolName, country)`);
            return;
          }
          
          // Prepare school data
          const schoolData = {
            schoolName: row.schoolName,
            country: row.country,
            city: row.city || null,
            address: row.address || null,
            website: row.website || null,
            email: row.email || null,
            phone: row.phone || null,
            description: row.description || null,
            requirements: row.requirements || null,
            logo: row.logo || null,
            isActive: row.isActive === 'true' || row.isActive === '1' || true
          };
          
          schools.push(schoolData);
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
    
    // Bulk create schools
    const createdSchools = await School.bulkCreate(schools, { transaction: t });
    
    await t.commit();
    
    // Delete the temporary file
    fs.unlinkSync(filePath);
    
    return messageHandler(
      'Schools imported successfully',
      true,
      201,
      {
        importedCount: createdSchools.length,
        schools: createdSchools
      }
    );
  } catch (error) {
    await t.rollback();
    console.error('Import schools error:', error);
    
    // Delete the temporary file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return messageHandler(
      error.message || 'Failed to import schools',
      false,
      500
    );
  }
}; 
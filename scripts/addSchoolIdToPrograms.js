import { sequelize } from '../database/db.js';

async function addSchoolIdColumn() {
  const query = `
    ALTER TABLE programs
    ADD COLUMN schoolId INT NOT NULL AFTER programId,
    ADD CONSTRAINT fk_programs_school
      FOREIGN KEY (schoolId) REFERENCES schools(schoolId)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    ADD INDEX idx_programs_school_id (schoolId);
  `;

  try {
    await sequelize.query(query);
    console.log('Successfully added schoolId column to programs table');
  } catch (error) {
    console.error('Error adding schoolId column:', error);
  } finally {
    await sequelize.close();
  }
}

addSchoolIdColumn();

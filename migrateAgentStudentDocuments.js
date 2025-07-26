// migrateAgentStudentDocuments.js
const mysql = require('mysql2/promise');

// Update these with your DB credentials
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: '',
};

const documentColumns = [
  'internationalPassport',
  'olevelResult',
  'olevelPin',
  'academicReferenceLetter',
  'resume',
  'universityDegreeCertificate',
  'universityTranscript',
  'sop',
  'researchDocs',
  'gmatGreScores',
  'languageTest',
  'languageTestCert',
  'otherDoc1',
  'otherDocName1',
  'otherDoc2',
  'otherDocName2',
  'otherDoc3',
  'otherDocName3',
];

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);

  // Get all old document rows
  const [rows] = await connection.execute('SELECT * FROM agent_application_documents');

  for (const row of rows) {
    // Lookup agentId for this memberId (adjust table/column names as needed)
    let agentId = null;
    try {
      const [agentRows] = await connection.execute(
        'SELECT agentId FROM agent_students WHERE memberId = ? LIMIT 1',
        [row.memberId]
      );
      agentId = agentRows.length ? agentRows[0].agentId : null;
    } catch (e) {
      console.error(`Error looking up agentId for memberId ${row.memberId}:`, e);
    }

    for (const docType of documentColumns) {
      const docValue = row[docType];
      if (docValue && docValue.trim() !== '') {
        // Insert into new table
        await connection.execute(
          `INSERT INTO agent_student_documents
            (memberId, agentId, documentType, documentPath, status, uploadDate)
           VALUES (?, ?, ?, ?, 'pending', NOW())`,
          [row.memberId, agentId, docType, docValue]
        );
        console.log(
          `Migrated memberId=${row.memberId}, agentId=${agentId}, type=${docType}, path=${docValue}`
        );
      }
    }
  }

  await connection.end();
  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
});
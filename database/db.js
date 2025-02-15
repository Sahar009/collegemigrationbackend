import { Sequelize } from 'sequelize';
import { config } from "../config/config.js";

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
)

export const connectToDB = async () => {
  try {
    await sequelize.authenticate()
    console.log("Connected to College-migration database successfully.")
    
    // Import models in order of dependencies
    const { Member } = await import('../schema/memberSchema.js');
    const { Program } = await import('../schema/programSchema.js');
    const { MemberAgent } = await import('../schema/memberAgentSchema.js');
    const { Application } = await import('../schema/applicationSchema.js');
    const { ApplicationDocument } = await import('../schema/applicationDocumentSchema.js');
    const { setupAssociations } = await import('../schema/associations.js');
    
    // Set up all model associations
    setupAssociations();
    
    // Sync without altering existing tables
    await sequelize.sync();
    console.log('Database schemas synchronized successfully');
    
  } catch (error) {
    console.error("Database connection/sync error:", {
      message: error.message,
      errorCode: error.parent?.code,
      sqlState: error.parent?.sqlState
    })
    
    if (error.parent?.code === 'ECONNREFUSED') {
      console.error("Could not connect to database. Please check if:")
      console.error("1. Database credentials are correct")
      console.error("2. Database server is accessible")
      console.error("3. Database port is open")
    }
    
    throw error
  }
}

export default sequelize


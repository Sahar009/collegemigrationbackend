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
    console.log("Connected to College-migration  database successfully.")
    
    // Import all your models here
    const { Program } = await import('../schema/programSchema.js');
    const { MemberAgent } = await import('../schema/memberAgentSchema.js');
    // Import other models as needed...
    
    // Sync all models with the database
    await sequelize.sync({ alter: true }); // This will create/update tables
    console.log('Database schemas synchronized successfully');
    
  } catch (error) {
    console.error("Database connection/sync error:", {
      message: error.message,
      errorCode: error.parent?.code,
      sqlState: error.parent?.sqlState
    })
    
    // Additional error information
    if (error.parent?.code === 'ECONNREFUSED') {
      console.error("Could not connect to database. Please check if:")
      console.error("1. Database credentials are correct")
      console.error("2. Database server is accessible")
      console.error("3. Database port is open")
    }
    
    throw error // Rethrow to handle it in server.js
  }
}

export default sequelize


import dotenv from 'dotenv'
dotenv.config()
import cors from 'cors'
import { API_ROUTES } from './config/constants.js';

import express from 'express'
import { connectToDB } from './database/db.js'
import errorMiddleware from './middlewares/errorMiddleware.js'
import router from './routes/index.js'
import { cloudinary } from './config/cloudinaryConfig.js';
const app = express()
const port = process.env.PORT || 8000


// middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))




app.use(cors({
  origin: '*',
  credentials: true
}))
router(app)

app.get('/', (req, res) => {
    res.json({success: true, message: 'Backend Connected Successfully'})
  })
  
// error middleware
app.use(errorMiddleware);

// not found
app.all('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Oops! Request not found. Cannot ${req.method} ${req.originalUrl}`,
    });
  });

// Connect to database before starting server
const startServer = async () => {
    try {
        await connectToDB();
        
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
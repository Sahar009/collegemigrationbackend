import dotenv from 'dotenv'
dotenv.config()
import cors from 'cors'
import express from 'express'
import { connectToDB } from './database/db.js'
import errorMiddleware from './middlewares/errorMiddleware.js'
import router from './routes/index.js'

const app = express()
const port = process.env.PORT


// middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))


app.use(cors())
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

connectToDB()

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
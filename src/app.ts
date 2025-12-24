import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { connectToDatabase } from './config/db';
import { Request, Response } from 'express';
import ownerRouter from './routes/ownerRoutes';
import filerouter from './routes/file_upload';
import { adminRouter } from './routes/adminRoutes';
import { underMaintenance } from './middleware/under_maintenance';
import { log } from 'console';
import { globalErrorHandler } from './middleware/error_handler';
import plansRouter from './routes/plansRoute';



// Load environment variables from .env file
dotenv.config();
// TODO: Always Match the Api response structure of db and cache

// connect to database
connectToDatabase()
// startCyclicFunc()
// console.log(process.env.DB_URL);
// console.log(process.env.JWT_SECRET);
// console.log(process.env.REFRESH_TOKEN_SECRET);
// console.log(process.env.ACCESS_TOKEN_EXPIRY);
// console.log(process.env.REFRESH_TOKEN_EXPIRY);
// console.log(process.env.REDIS_URL);
// console.log(process.env.REDIS_SECRET);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/owners', ownerRouter)
app.use('/api', filerouter)

app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/users', userRoutes);
app.use('/v1/api/owners', ownerRouter)
app.use('/v1/api', filerouter)
app.use('/v1/api/admin',adminRouter)

app.use('/v1/api/plans',plansRouter)
app.get("/", (req: Request, res: Response) => {
    res.json({ "Leazo": "Welcome to LeazOOOOOOOOOO!" });
})

// Global Error Handler - Must be the last middleware
app.use(globalErrorHandler);


// async function startCyclicFunc() {
//   setInterval(async () => {
//     try {
//       await axios.get('https://leazo-server.onrender.com/').then((res)=>{
//         console.log(res.status);
//       });
//     } catch (error) {
//       console.error(`Error in cyclic function: ${error}`);
//     }
//   }, 1000 * 60 *10); // 10 minutes
// }
// startCyclicFunc();

// Export app for testing
export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
    const memoryUsage = process.memoryUsage();
    log('Memory Usage:');
    Object.entries(memoryUsage).forEach(([key, value]) => {
      log(`  ${key}: ${(value / 1024 / 1024).toFixed(2)} MB`);
    });
    });
}

import dotenv from 'dotenv';
import express from 'express';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { connectToDatabase } from './config/db';
import { Request, Response } from 'express';
import ownerRouter from './routes/ownerRoutes';
import jwt from 'jsonwebtoken';
// Load environment variables from .env file
dotenv.config();

// connect to database
connectToDatabase()

// console.log(process.env.DB_URL);
// console.log(process.env.JWT_SECRET);
// console.log(process.env.REFRESH_TOKEN_SECRET);
// console.log(process.env.ACCESS_TOKEN_EXPIRY);
// console.log(process.env.REFRESH_TOKEN_EXPIRY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/owners', ownerRouter)


app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to LeazOOOOOOOOOO!");
})
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

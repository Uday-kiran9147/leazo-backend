import dotenv from 'dotenv';
import express from 'express';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { connectToDatabase } from './config/db';
import { Request, Response } from 'express';
import ownerRouter from './routes/ownerRoutes';
import filerouter from './routes/file_upload';
dotenv.config();
// TODO: Always Match the Api response structure of db and cache

// connect to database
connectToDatabase()

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

app.get("/", (req: Request, res: Response) => {
    res.json({ "Leazo": "Welcome to LeazOOOOOOOOOO!" });
})

setInterval(async () => {
    console.log("Hello")
}, 10000 * 6 * 14)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // sendPushNotification("","","")
});

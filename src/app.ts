import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' :
  nodeEnv === 'test' ? '.env.test' : '.env.development';


// Environment logging
logger.info('Environment: '+nodeEnv+': loading variables from '+envFile);

// Sample Enterprise Logs
// logger.info("Initializing Enterprise Logging System...");
// logger.success("Logger system ready for production.");
// logger.warn("Potential configuration issue detected (Sample)", { config: "missing_key" });
// logger.debug("Database connection pool initialized (Sample)", { poolSize: 10, timeout: "5s" });
// logger.error("Sample Error: Failed to fetch external resource", new Error("Connection Timeout"));
// logger.fatal("System Critical: Power supply failure (Sample Simulation)");
// Load environment variables based on NODE_ENV as an array (v17+ tip)
dotenv.config({
  path: [
    path.resolve(process.cwd(), envFile),
    // path.resolve(process.cwd(), '.env')
  ]
});
import express from 'express';
import cors from 'cors';
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
import { paymentsRouter } from './routes/paymentsRoutes';
import { webhookRouter } from './routes/webhookRouter';
import { PaymentEntity } from './payments/payments.models';
import { startPlanExpiryCron } from './cron/planExpiryCron';



// Load environment variables from .env file

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
// console.log("DODO KEY:", process.env.DODO_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
// Request URL logging middleware
app.use((req: Request, res: Response, next: any) => {
  logger.info(`${req.method} ${req.originalUrl}`,
    // {
    //   ip: req.ip,
    //   userAgent: req.get('user-agent')
    // }
);
  next();
});
// In app.ts or webhook route, use raw body parsing for webhooks:
app.use('/v1/api/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use('/v1/api/webhooks', webhookRouter);

app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

// Development error handling
if (process.env.NODE_ENV === 'development') {
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.status || 500).json({
      message: err.message,
      error: err
    });
  });
}

// Production error handling
if (process.env.NODE_ENV === 'production') {
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.status || 500).json({
      message: 'Something went wrong!',
      error: {}
    });
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/owners', ownerRouter)
app.use('/api', filerouter)

app.use('/v1/api/payments', paymentsRouter);
app.use('/v1/api/plans', plansRouter)
app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/users', userRoutes);
app.use('/v1/api/owners', ownerRouter)
app.use('/v1/api/admin',adminRouter)
app.use('/v1/api', filerouter)

app.get("/", (req: Request, res: Response) => {
    res.json({ "Leazo": "Welcome to LeazOOOOOOOOOO!" });
})


app.get("/api/subscription-status", async (req: Request, res: Response) => {

  const internalPaymentId = req.query.internal_payment_id as string;
  if (!internalPaymentId) {
    return res.status(400).json({ error: "internal_payment_id required" });
  }

  const record = await PaymentEntity.findById(internalPaymentId);
  if (!record) {
    return res.status(404).json({ error: "Payment record not found" });
  }

  logger.debug("Payment record fetched", { id: record._id, status: record.status });
  return res.json({
    status: record.status,
    subscription_id: record.gatewaySubscriptionId ?? null,
  });
    
});

// Global Error Handler - Must be the last middleware
app.use(globalErrorHandler);


async function startCyclicFunc() {
  const SERVER_URL = process.env.SERVER_URL || 'https://leazo-c0dcckatczfpdrg6.southindia-01.azurewebsites.net';
  setInterval(async () => {
    try {
      await axios.get(SERVER_URL).then((res) => {
        logger.debug(`Keep-alive ping status: ${res.status}`);
      });
    } catch (error) {
      logger.error(`Error in cyclic function`, error);
    }
  }, 1000 * 60*10); // 10 minutes
}

if (process.env.NODE_ENV !== 'test') {
  logger.info("Starting background services...");
  // startCyclicFunc();
  startPlanExpiryCron();
}

// Export app for testing
export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.success(`Server established successfully!`, {
      port: PORT,
      url: `http://localhost:${PORT}`,
      env: nodeEnv
    });
  });
}

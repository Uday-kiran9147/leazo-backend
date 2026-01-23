import express,{Router} from 'express';
import { auth } from '../middleware/auth.middleware';
import { createOrder, verifyPayment } from '../controller/razorpay.controller';

export const paymentsRouter = Router();

// Define payment routes here



paymentsRouter.post('/razorpay/create-order', auth, createOrder);
paymentsRouter.post('/razorpay/verify-payment', auth, verifyPayment);

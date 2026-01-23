import express,{Router} from 'express';
import { auth } from '../middleware/auth.middleware';

import { createSubscription as createRazorpaySubscription, verifySubscription as verifyRazorpaySubscription } from '../controller/razorpay.controller';
export const paymentsRouter = Router();

// Define payment routes here



paymentsRouter.post('/razorpay/create-subscription', auth, createRazorpaySubscription);
paymentsRouter.post('/razorpay/verify-payment', auth, verifyRazorpaySubscription);

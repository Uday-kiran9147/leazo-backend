import express,{Router} from 'express';
import { auth } from '../middleware/auth.middleware';
import { getCheckoutSessionMiddleware } from '../middleware/payment.middleware';
import { getCheckoutSession} from '../controller/payments.Controller';
import { dodoWebhookHandler } from '../payments/dodo_webhooks';

export const paymentsRouter = Router();

// Define payment routes here

paymentsRouter.get('/dodo/create-checkout-session',auth,getCheckoutSessionMiddleware, getCheckoutSession);

import express,{Router} from 'express';
import { dodoWebhookHandler } from '../payments/dodo_webhooks';

export const webhookRouter = Router();


webhookRouter.post('/dodo',express.raw({ type: "application/json" }), dodoWebhookHandler);

// ============================================================================
// FILE: src/routes/webhookRouter.ts
// Purpose: Webhook routes (no auth, raw body for signature verification)
// ============================================================================

import express, { Router } from 'express';
import { handleWebhook } from '../controller/razorpay.controller';

export const webhookRouter = Router();

// Razorpay webhook - needs raw JSON body for signature verification
webhookRouter.post('/razorpay', express.json(), handleWebhook);
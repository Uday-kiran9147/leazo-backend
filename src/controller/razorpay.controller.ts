// ============================================================================
// FILE: src/controller/razorpay.controller.ts
// Purpose: HTTP request handlers for Razorpay endpoints
// ============================================================================

import { Request, Response } from 'express';
import { subscriptionService, webhookService } from '../services/razorpay';
import { RAZORPAY_CONFIG } from '../config/razorpayConfig';


/**
 * Create a new subscription
 * POST /api/v1/payments/razorpay/subscription
 */
export const createSubscription = async (req: Request, res: Response) => {
    try {
        const { planId, email, name, phone, totalCount } = req.body;
        const userId = (req as any).user?.id || (req as any).userId;

        if (!planId || !email || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: planId, email, name' 
            });
        }

        const result = await subscriptionService.createSubscription({
            userId,
            planId,
            email,
            name,
            phone,
            totalCount
        });

        res.status(200).json({
            success: true,
            data: {
                subscriptionId: result.subscriptionId,
                shortUrl: result.shortUrl,
                key: RAZORPAY_CONFIG.key_id
            }
        });
    } catch (error: any) {
        console.error('[Razorpay Controller] createSubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create subscription' 
        });
    }
};

/**
 * Verify subscription payment
 * POST /api/v1/payments/razorpay/subscription/verify
 */
export const verifySubscription = async (req: Request, res: Response) => {
    try {
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing verification parameters' 
            });
        }

        const isValid = subscriptionService.verifySignature({
            razorpayPaymentId: razorpay_payment_id,
            razorpaySubscriptionId: razorpay_subscription_id,
            razorpaySignature: razorpay_signature
        });

        if (!isValid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid payment signature' 
            });
        }
        // log
        console.log('[Razorpay Controller] Subscription payment verified successfully');
        res.status(200).json({ success: true, verified: true });
    } catch (error: any) {
        console.error('[Razorpay Controller] verifySubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Verification failed' 
        });
    }
};

/**
 * Get subscription details
 * GET /api/v1/payments/razorpay/subscription/:subscriptionId
 */
export const getSubscription = async (req: Request, res: Response) => {
    try {
        const { subscriptionId } = req.params;
        const subscription = await subscriptionService.getSubscription(subscriptionId);
        
        res.status(200).json({ success: true, data: subscription });
    } catch (error: any) {
        console.error('[Razorpay Controller] getSubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch subscription' 
        });
    }
};

/**
 * Get current user's subscription
 * GET /api/v1/payments/razorpay/subscription/me
 */
export const getMySubscription = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).userId;
        const result = await subscriptionService.getUserSubscription(userId);

        if (!result) {
            return res.status(404).json({ 
                success: false, 
                error: 'No active subscription found' 
            });
        }

        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Razorpay Controller] getMySubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch subscription' 
        });
    }
};

/**
 * Cancel subscription
 * POST /api/v1/payments/razorpay/subscription/cancel
 */
export const cancelSubscription = async (req: Request, res: Response) => {
    try {
        const { subscriptionId, cancelAtCycleEnd = true } = req.body;

        if (!subscriptionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'subscriptionId is required' 
            });
        }

        const result = await subscriptionService.cancelSubscription(subscriptionId, cancelAtCycleEnd);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Razorpay Controller] cancelSubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to cancel subscription' 
        });
    }
};

/**
 * Pause subscription
 * POST /api/v1/payments/razorpay/subscription/pause
 */
export const pauseSubscription = async (req: Request, res: Response) => {
    try {
        const { subscriptionId } = req.body;
        const result = await subscriptionService.pauseSubscription(subscriptionId);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Razorpay Controller] pauseSubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to pause subscription' 
        });
    }
};

/**
 * Resume subscription
 * POST /api/v1/payments/razorpay/subscription/resume
 */
export const resumeSubscription = async (req: Request, res: Response) => {
    try {
        const { subscriptionId } = req.body;
        const result = await subscriptionService.resumeSubscription(subscriptionId);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Razorpay Controller] resumeSubscription error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to resume subscription' 
        });
    }
};

/**
 * Change subscription plan
 * POST /api/v1/payments/razorpay/subscription/change-plan
 */
export const changePlan = async (req: Request, res: Response) => {
    try {
        const { subscriptionId, newPlanId, scheduleChangeAt = 'cycle_end' } = req.body;

        if (!subscriptionId || !newPlanId) {
            return res.status(400).json({ 
                success: false, 
                error: 'subscriptionId and newPlanId are required' 
            });
        }

        const result = await subscriptionService.updateSubscription(
            subscriptionId, 
            newPlanId, 
            scheduleChangeAt
        );
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Razorpay Controller] changePlan error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to change plan' 
        });
    }
};

/**
 * Handle Razorpay webhooks
 * https://leazo-c0dcckatczfpdrg6.southindia-01.azurewebsites.net/api/v1/webhooks/razorpay
 * POST /v1/api/webhooks/razorpay
 */
export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;
        
        if (!signature) {
            return res.status(400).send('Missing signature');
        }

        // Validate signature
        const isValid = webhookService.validateSignature(
            JSON.stringify(req.body),
            signature
        );

        if (!isValid) {
            console.error('[Razorpay Webhook] Invalid signature');
            return res.status(400).send('Invalid signature');
        }

        // Process the webhook
        await webhookService.processEvent(req.body);
        
        res.status(200).send('ok');
    } catch (error: any) {
        console.error('[Razorpay Webhook] Error:', error);
        res.status(500).send('Webhook processing failed');
    }
};
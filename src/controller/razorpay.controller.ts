// ============================================================================
// FILE: src/controller/razorpay.controller.ts
// Purpose: HTTP request handlers for Razorpay endpoints
// ============================================================================

import { Request, Response } from 'express';
import { orderService, webhookService } from '../services/razorpay';
import { RAZORPAY_CONFIG } from '../config/razorpayConfig';
import { logger } from '../utils/logger';

/**
 * Create a new order
 * POST /api/v1/payments/razorpay/order
 */
export const createOrder = async (req: Request, res: Response) => {
    try {
        var user = (req.body.user);
        req.body.razorpayData = {
            planId: req.body.planId,
            email: user.email,
            name: user.firstName + ' ' + user.lastName,
            phone: req.body.user.phoneNumber,
            totalCount: req.body.totalCount || 12
        }
        const { planId, email, name, phone } = req.body.razorpayData;
        const userId = (req.body as any).user?.id;

        if (!planId || !email || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: planId, email, name' 
            });
        }

        const result = await orderService.createOrder({
            userId,
            planId,
            email,
            name,
            phone,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        logger.error('[Razorpay Controller] createOrder error', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create order' 
        });
    }
};

/**
 * Verify payment after checkout
 * POST /api/v1/payments/razorpay/verify
 */
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing verification parameters' 
            });
        }

        const isValid = orderService.verifyPayment({
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
        });

        if (!isValid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid payment signature' 
            });
        }

        // Mark payment as completed
        await orderService.completePayment(razorpay_order_id, razorpay_payment_id);

        res.status(200).json({ success: true, verified: true });
    } catch (error: any) {
        logger.error('[Razorpay Controller] verifyPayment error', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Verification failed' 
        });
    }
};

/**
 * Get order details
 * GET /api/v1/payments/razorpay/order/:orderId
 */
export const getOrder = async (req: Request, res: Response) => {
    try {
        const { orderId: rawOrderId } = req.params;
        const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
        const order = await orderService.getOrder(orderId as string);
        
        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        logger.error('[Razorpay Controller] getOrder error', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch order' 
        });
    }
};

/**
 * Get user's payment history
 * GET /api/v1/payments/razorpay/history
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).userId;
        const limit = parseInt(req.query.limit as string) || 10;
        
        const payments = await orderService.getUserPayments(userId, limit);

        res.status(200).json({ success: true, data: payments });
    } catch (error: any) {
        logger.error('[Razorpay Controller] getPaymentHistory error', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch payment history' 
        });
    }
};

/**
 * Refund a payment
 * POST /api/v1/payments/razorpay/refund
 */
export const refundPayment = async (req: Request, res: Response) => {
    try {
        const { paymentId, amount, notes } = req.body;

        if (!paymentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'paymentId is required' 
            });
        }

        const refund = await orderService.refundPayment(paymentId, amount, notes);
        res.status(200).json({ success: true, data: refund });
    } catch (error: any) {
        logger.error('[Razorpay Controller] refundPayment error', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to process refund' 
        });
    }
};

/**
 * Handle Razorpay webhooks
 * POST /api/v1/webhooks/razorpay
 */
export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;
        
        if (!signature) {
            return res.status(400).send('Missing signature');
        }

        // Use raw body (Buffer) for signature validation
        const rawBody = req.body; // This is now a Buffer, not parsed JSON
        
        const isValid = webhookService.validateSignature(
            rawBody.toString(), // Convert buffer to string
            signature
        );


        if (!isValid) {
            logger.error('[Razorpay Webhook] Invalid signature');
            return res.status(400).send('Invalid signature');
        }

        // Parse the body now for processing
        const payload = JSON.parse(rawBody.toString());
        await webhookService.processEvent(payload);
        
        res.status(200).send('ok');
    } catch (error: any) {
        logger.error('[Razorpay Webhook] Error processing event', error);
        res.status(500).send('Webhook processing failed');
    }
};
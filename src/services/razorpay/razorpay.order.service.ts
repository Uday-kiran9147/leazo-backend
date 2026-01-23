// ============================================================================
// FILE: src/services/razorpay/razorpay.order.service.ts
// Purpose: Order-based payment operations (one-time payments)
// ============================================================================

import crypto from 'crypto';
import { razorpayClient } from './razorpay.client';
import { RAZORPAY_CONFIG } from '../../config/razorpayConfig';
import { PaymentEntity } from '../../payments/payments.models';
import { getPlanRules } from '../../config/ownerConfig';
import { getTenantPlanRules } from '../../config/tenantConfig';
import {
    CreateOrderInput,
    OrderResult,
    VerifyPaymentInput,
} from './razorpay.types';

export class RazorpayOrderService {
    
    /**
     * Create a new order for one-time payment
     */
    async createOrder(input: CreateOrderInput): Promise<OrderResult> {
        const { userId, planId, email, name, phone, notes } = input;

        // Get plan price
        const amount = this.getPlanPrice(planId);
        if (amount <= 0) {
            throw new Error(`Invalid plan or free plan: ${planId}`);
        }

        // Create payment record first
        const paymentRecord = await PaymentEntity.create({
            userId,
            gateway: 'razorpay',
            status: 'initiated',
            planId,
            totalAmount: amount * 100, // Store in paise
            currency: 'INR',
            metadata: { email, name, phone }
        });

        try {
            // Create order in Razorpay
            const order = await razorpayClient.orders.create({
                amount: amount * 100, // Amount in paise
                currency: 'INR',
                receipt: paymentRecord._id.toString(),
                notes: {
                    userId,
                    planId,
                    paymentRecordId: paymentRecord._id.toString(),
                    email,
                    name,
                    ...notes
                }
            });

            // Update payment record with order ID
            paymentRecord.orderId = order.id;
            await paymentRecord.save();

            return {
                orderId: order.id,
                amount: Number(order.amount),
                currency: order.currency,
                status: order.status,
                paymentRecordId: paymentRecord._id.toString(),
                key: RAZORPAY_CONFIG.key_id,
            };
        } catch (error) {
            // Cleanup payment record on failure
            paymentRecord.status = 'failed';
            paymentRecord.metadata = { ...paymentRecord.metadata, error: (error as Error).message };
            await paymentRecord.save();
            throw error;
        }
    }

    /**
     * Verify payment signature after checkout
     */
    verifyPayment(input: VerifyPaymentInput): boolean {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

        // For orders: signature = HMAC(order_id + "|" + payment_id)
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_CONFIG.key_secret.trim())
            .update(`${razorpayOrderId.trim()}|${razorpayPaymentId.trim()}`)
            .digest('hex');

        if (process.env.NODE_ENV !== 'production') {
            console.log('[Razorpay] Verifying payment signature');
            console.log('[Razorpay] Order ID:', razorpayOrderId);
            console.log('[Razorpay] Payment ID:', razorpayPaymentId);
        }

        return expectedSignature === razorpaySignature;
    }

    /**
     * Fetch order details from Razorpay
     */
    async getOrder(orderId: string) {
        return razorpayClient.orders.fetch(orderId);
    }

    /**
     * Fetch all orders with optional filters
     */
    async getAllOrders(options?: {
        from?: number;
        to?: number;
        count?: number;
        skip?: number;
        authorized?: 0 | 1;
        receipt?: string;
    }) {
        return razorpayClient.orders.all(options || {});
    }

    /**
     * Fetch payments for an order
     */
    async getOrderPayments(orderId: string) {
        return razorpayClient.orders.fetchPayments(orderId);
    }

    /**
     * Fetch payment details
     */
    async getPayment(paymentId: string) {
        return razorpayClient.payments.fetch(paymentId);
    }

    /**
     * Capture an authorized payment (if manual capture is enabled)
     */
    async capturePayment(paymentId: string, amount: number, currency: string = 'INR') {
        return razorpayClient.payments.capture(paymentId, amount, currency);
    }

    /**
     * Refund a payment
     */
    async refundPayment(paymentId: string, amount?: number, notes?: Record<string, string>) {
        const refundData: any = {};
        if (amount) refundData.amount = amount;
        if (notes) refundData.notes = notes;
        
        return razorpayClient.payments.refund(paymentId, refundData);
    }

    /**
     * Fetch all refunds for a payment
     */
    async getPaymentRefunds(paymentId: string) {
        return razorpayClient.payments.fetchMultipleRefund(paymentId);
    }

    /**
     * Get user's payment history
     */
    async getUserPayments(userId: string, limit: number = 10) {
        const payments = await PaymentEntity.find({
            userId,
            gateway: 'razorpay',
        })
        .sort({ createdAt: -1 })
        .limit(limit);

        return payments;
    }

    /**
     * Get user's active/latest completed payment
     */
    async getUserActivePayment(userId: string) {
        const payment = await PaymentEntity.findOne({
            userId,
            gateway: 'razorpay',
            status: { $in: ['completed', 'captured'] }
        }).sort({ createdAt: -1 });

        if (!payment?.orderId) {
            return null;
        }

        const order = await this.getOrder(payment.orderId);
        return { payment, order };
    }

    /**
     * Mark payment as completed and update payment record
     */
    async completePayment(orderId: string, paymentId: string): Promise<void> {
        const paymentRecord = await PaymentEntity.findOne({ gatewayOrderId: orderId });
        
        if (paymentRecord) {
            paymentRecord.status = 'completed';
            paymentRecord.gatewayPaymentId = paymentId;
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                completedAt: new Date().toISOString(),
            };
            await paymentRecord.save();
        }
    }

    /**
     * Get plan price (for display purposes)
     */
    getPlanPrice(planId: string): number {
        if (planId.startsWith('owner_')) {
            const rules = getPlanRules(planId as any);
            return rules?.price || 0;
        } else if (planId.startsWith('tenant_')) {
            const rules = getTenantPlanRules(planId as any);
            return rules?.price || 0;
        }
        return 0;
    }
}

// Export singleton instance
export const orderService = new RazorpayOrderService();
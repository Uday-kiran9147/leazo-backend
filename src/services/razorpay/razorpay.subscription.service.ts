// ============================================================================
// FILE: src/services/razorpay/razorpay.subscription.service.ts
// Purpose: Subscription-specific operations
// ============================================================================

import crypto from 'crypto';
import { razorpayClient } from './razorpay.client';
import { RAZORPAY_CONFIG } from '../../config/razorpayConfig';
import { PaymentEntity } from '../../payments/payments.models';
import { getPlanRules } from '../../config/ownerConfig';
import { getTenantPlanRules } from '../../config/tenantConfig';
import {
    CreateSubscriptionInput,
    SubscriptionResult,
    VerifySubscriptionInput,
} from './razorpay.types';

export class RazorpaySubscriptionService {
    
    /**
     * Create a new subscription
     */
    async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
        const { userId, planId, email, name, phone, totalCount = 12, notes } = input;

        // Get Razorpay plan ID from config
        const razorpayPlanId = this.getRazorpayPlanId(planId);
        if (!razorpayPlanId) {
            throw new Error(`Razorpay Plan ID not configured for: ${planId}`);
        }

        // Create payment record first
        const paymentRecord = await PaymentEntity.create({
            userId,
            gateway: 'razorpay',
            status: 'initiated',
            planId,
            metadata: { email, name, phone }
        });

        try {
            // Create subscription in Razorpay
            const subscription = await razorpayClient.subscriptions.create({
                plan_id: razorpayPlanId,
                total_count: totalCount,
                customer_notify: 1,
                notes: {
                    userId,
                    planId,
                    paymentRecordId: paymentRecord._id.toString(),
                    email,
                    name,
                    ...notes
                }
            });

            // Update payment record with subscription ID
            paymentRecord.gatewaySubscriptionId = subscription.id;
            await paymentRecord.save();

            return {
                subscriptionId: subscription.id,
                shortUrl: subscription.short_url,
                status: subscription.status,
                paymentRecordId: paymentRecord._id.toString()
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
     * Verify subscription payment signature
     */
    verifySignature(input: VerifySubscriptionInput): boolean {
        const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = input;
        
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_CONFIG.key_secret)
            .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
            .digest('hex');

        return expectedSignature === razorpaySignature;
    }

    /**
     * Fetch subscription details from Razorpay
     */
    async getSubscription(subscriptionId: string) {
        return razorpayClient.subscriptions.fetch(subscriptionId);
    }

    /**
     * Fetch all subscriptions with optional filters
     */
    async getAllSubscriptions(options?: {
        plan_id?: string;
        count?: number;
        skip?: number;
    }) {
        return razorpayClient.subscriptions.all(options || {});
    }

    /**
     * Cancel a subscription
     * @param cancelAtCycleEnd - If true, subscription ends after current billing cycle
     */
    async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true) {
        return razorpayClient.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    }

    /**
     * Pause a subscription
     */
    async pauseSubscription(subscriptionId: string) {
        return razorpayClient.subscriptions.pause(subscriptionId);
    }

    /**
     * Resume a paused subscription
     */
    async resumeSubscription(subscriptionId: string) {
        return razorpayClient.subscriptions.resume(subscriptionId);
    }

    /**
     * Update subscription (change plan)
     */
    async updateSubscription(
        subscriptionId: string, 
        newPlanId: string, 
        scheduleChangeAt: 'now' | 'cycle_end' = 'cycle_end'
    ) {
        const razorpayPlanId = this.getRazorpayPlanId(newPlanId);
        if (!razorpayPlanId) {
            throw new Error(`Razorpay Plan ID not configured for: ${newPlanId}`);
        }

        return razorpayClient.subscriptions.update(subscriptionId, {
            plan_id: razorpayPlanId,
            schedule_change_at: scheduleChangeAt
        });
    }

    /**
     * Create addon (one-time charge on subscription)
     */
    async createAddon(subscriptionId: string, itemName: string, amount: number, quantity: number = 1) {
        return razorpayClient.subscriptions.createAddon(subscriptionId, {
            item: {
                name: itemName,
                amount,
                currency: 'INR'
            },
            quantity
        });
    }

    /**
     * Get user's active subscription
     */
    async getUserSubscription(userId: string) {
        const payment = await PaymentEntity.findOne({
            userId,
            gateway: 'razorpay',
            gatewaySubscriptionId: { $exists: true, $ne: null },
            status: { $in: ['completed', 'active', 'authenticated'] }
        }).sort({ createdAt: -1 });

        if (!payment?.gatewaySubscriptionId) {
            return null;
        }

        const subscription = await this.getSubscription(payment.gatewaySubscriptionId);
        return { payment, subscription };
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

    /**
     * Get Razorpay Plan ID from internal plan ID
     */
    private getRazorpayPlanId(planId: string): string | null {
        const planMap = RAZORPAY_CONFIG.plans as Record<string, string>;
        return planMap[planId] || null;
    }
}

// Export singleton instance
export const subscriptionService = new RazorpaySubscriptionService();
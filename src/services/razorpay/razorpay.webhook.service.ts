// ============================================================================
// FILE: src/services/razorpay/razorpay.webhook.service.ts
// Purpose: Webhook handling and business logic triggers
// ============================================================================

import Razorpay from 'razorpay';
import { PaymentEntity, IPayment } from '../../payments/payments.models';
import { activateOwnerBusinessLogic, activateTenantBusinessLogic } from '../../payments/payment_logic';
import { Owner } from '../../models/owner.model';
import { User } from '../../models/user.model';
import { WebhookPayload, RazorpaySubscriptionEntity } from './razorpay.types';

export class RazorpayWebhookService {
    private webhookSecret: string;

    constructor() {
        this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    }

    /**
     * Validate webhook signature
     */
    validateSignature(body: string, signature: string): boolean {
        if (!this.webhookSecret) {
            console.error('[Razorpay Webhook] Webhook secret not configured');
            return false;
        }
        return Razorpay.validateWebhookSignature(body, signature, this.webhookSecret);
    }

    /**
     * Process webhook event
     */
    async processEvent(payload: WebhookPayload): Promise<void> {
        const { event } = payload;
        console.log(`[Razorpay Webhook] Processing event: ${event}`);

        const handlers: Record<string, () => Promise<void>> = {
            'subscription.authenticated': () => this.handleSubscriptionAuthenticated(payload),
            'subscription.activated': () => this.handleSubscriptionActivated(payload),
            'subscription.charged': () => this.handleSubscriptionCharged(payload),
            'subscription.pending': () => this.handleSubscriptionPending(payload),
            'subscription.halted': () => this.handleSubscriptionHalted(payload),
            'subscription.cancelled': () => this.handleSubscriptionCancelled(payload),
            'subscription.completed': () => this.handleSubscriptionCompleted(payload),
            'subscription.expired': () => this.handleSubscriptionExpired(payload),
            'subscription.paused': () => this.handleSubscriptionPaused(payload),
            'subscription.resumed': () => this.handleSubscriptionResumed(payload),
        };

        const handler = handlers[event];
        if (handler) {
            await handler();
        } else {
            console.log(`[Razorpay Webhook] Unhandled event: ${event}`);
        }
    }

    // ========== Event Handlers ==========

    private async handleSubscriptionAuthenticated(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatus(subscription.id, 'authenticated');
        console.log(`[Razorpay] Subscription authenticated: ${subscription.id}`);
    }

    private async handleSubscriptionActivated(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        const payment = payload.payload.payment?.entity;
        if (!subscription) return;

        const paymentRecord = await this.findPaymentBySubscription(subscription.id);
        if (!paymentRecord) {
            console.error(`[Razorpay] No payment record for subscription: ${subscription.id}`);
            return;
        }

        paymentRecord.status = 'completed';
        paymentRecord.gatewayPaymentId = payment?.id;
        await paymentRecord.save();

        await this.activateUserPlan(paymentRecord, subscription);
        console.log(`[Razorpay] Subscription activated: ${subscription.id}`);
    }

    private async handleSubscriptionCharged(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        const payment = payload.payload.payment?.entity;
        if (!subscription) return;

        const paymentRecord = await this.findPaymentBySubscription(subscription.id);
        if (!paymentRecord) return;

        // Update payment info
        paymentRecord.gatewayPaymentId = payment?.id;
        paymentRecord.status = 'completed';
        paymentRecord.metadata = {
            ...paymentRecord.metadata,
            lastChargedAt: new Date().toISOString(),
            chargeCount: (paymentRecord.metadata?.chargeCount || 0) + 1
        };
        await paymentRecord.save();

        // Renew subscription
        await this.activateUserPlan(paymentRecord, subscription);
        console.log(`[Razorpay] Subscription charged: ${subscription.id}`);
    }

    private async handleSubscriptionPending(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatus(subscription.id, 'pending');
        console.log(`[Razorpay] Subscription pending: ${subscription.id}`);
    }

    private async handleSubscriptionHalted(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.handleSubscriptionEnd(subscription.id, 'halted');
        console.log(`[Razorpay] Subscription halted: ${subscription.id}`);
    }

    private async handleSubscriptionCancelled(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.handleSubscriptionEnd(subscription.id, 'cancelled');
        console.log(`[Razorpay] Subscription cancelled: ${subscription.id}`);
    }

    private async handleSubscriptionCompleted(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.handleSubscriptionEnd(subscription.id, 'completed');
        console.log(`[Razorpay] Subscription completed: ${subscription.id}`);
    }

    private async handleSubscriptionExpired(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatus(subscription.id, 'expired');
        console.log(`[Razorpay] Subscription expired: ${subscription.id}`);
    }

    private async handleSubscriptionPaused(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatus(subscription.id, 'paused');
        await this.updateUserSubscriptionStatus(subscription.id, false, 'paused');
        console.log(`[Razorpay] Subscription paused: ${subscription.id}`);
    }

    private async handleSubscriptionResumed(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatus(subscription.id, 'active');
        await this.updateUserSubscriptionStatus(subscription.id, true, 'active');
        console.log(`[Razorpay] Subscription resumed: ${subscription.id}`);
    }

    // ========== Helper Methods ==========

    private async findPaymentBySubscription(subscriptionId: string): Promise<IPayment | null> {
        return PaymentEntity.findOne({ gatewaySubscriptionId: subscriptionId });
    }

    private async updatePaymentStatus(subscriptionId: string, status: string): Promise<void> {
        await PaymentEntity.updateOne(
            { gatewaySubscriptionId: subscriptionId },
            { status }
        );
    }

    private async activateUserPlan(
        paymentRecord: IPayment, 
        subscription: RazorpaySubscriptionEntity
    ): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const planId = paymentRecord.planId;
        const isOwner = planId.startsWith('owner_');

        // Calculate end date from Razorpay
        const currentEnd = subscription.current_end 
            ? new Date(subscription.current_end * 1000) 
            : null;

        if (isOwner) {
            await Owner.findOneAndUpdate(
                { userId },
                {
                    gatewaySubscriptionId: subscription.id,
                    autoRenew: true,
                    subscriptionStatus: 'active',
                    ...(currentEnd && { planExpiresAt: currentEnd })
                }
            );
            await activateOwnerBusinessLogic(paymentRecord);
        } else {
            await User.findByIdAndUpdate(userId, {
                gatewaySubscriptionId: subscription.id,
                autoRenew: true,
                subscriptionStatus: 'active',
                ...(currentEnd && { planExpiresAt: currentEnd })
            });
            await activateTenantBusinessLogic(paymentRecord);
        }
    }

    private async handleSubscriptionEnd(subscriptionId: string, reason: string): Promise<void> {
        const paymentRecord = await this.findPaymentBySubscription(subscriptionId);
        if (!paymentRecord) return;

        paymentRecord.status = reason;
        await paymentRecord.save();

        const userId = paymentRecord.userId.toString();
        const isOwner = paymentRecord.planId.startsWith('owner_');
        const fallbackPlan = isOwner ? 'owner_free' : 'tenant_free';

        // Downgrade to free plan
        if (isOwner) {
            await Owner.findOneAndUpdate({ userId }, { 
                autoRenew: false, 
                subscriptionStatus: reason 
            });
            await activateOwnerBusinessLogic(null, userId, fallbackPlan);
        } else {
            await User.findByIdAndUpdate(userId, { 
                autoRenew: false, 
                subscriptionStatus: reason 
            });
            await activateTenantBusinessLogic(null, userId, fallbackPlan);
        }
    }

    private async updateUserSubscriptionStatus(
        subscriptionId: string, 
        autoRenew: boolean, 
        status: string
    ): Promise<void> {
        const paymentRecord = await this.findPaymentBySubscription(subscriptionId);
        if (!paymentRecord) return;

        const userId = paymentRecord.userId.toString();
        const isOwner = paymentRecord.planId.startsWith('owner_');

        if (isOwner) {
            await Owner.findOneAndUpdate({ userId }, { autoRenew, subscriptionStatus: status });
        } else {
            await User.findByIdAndUpdate(userId, { autoRenew, subscriptionStatus: status });
        }
    }
}

// Export singleton instance
export const webhookService = new RazorpayWebhookService();
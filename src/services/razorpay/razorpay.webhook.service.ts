// ============================================================================
// FILE: src/services/razorpay/razorpay.webhook.service.ts
// Purpose: Webhook handling and business logic triggers
// ============================================================================

import Razorpay from 'razorpay';
import { PaymentEntity, IPayment } from '../../payments/payments.models';
import { activateOwnerBusinessLogic, activateTenantBusinessLogic } from '../../payments/payment_logic';
import { Owner } from '../../models/owner.model';
import { User } from '../../models/user.model';
import { 
    WebhookPayload, 
    RazorpaySubscriptionEntity,
    RazorpayPaymentEntity,
    RazorpayDisputeEntity,
    RazorpayDowntimeEntity,
} from './razorpay.types';
import { sendPushNotification } from '../../utils/push_notifications';

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
            // ========== Subscription Events ==========
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

            // ========== Payment Events ==========
            'payment.authorized': () => this.handlePaymentAuthorized(payload),
            'payment.captured': () => this.handlePaymentCaptured(payload),
            'payment.failed': () => this.handlePaymentFailed(payload),

            // ========== Dispute Events ==========
            'payment.dispute.created': () => this.handleDisputeCreated(payload),
            'payment.dispute.won': () => this.handleDisputeWon(payload),
            'payment.dispute.lost': () => this.handleDisputeLost(payload),
            'payment.dispute.closed': () => this.handleDisputeClosed(payload),
            'payment.dispute.under_review': () => this.handleDisputeUnderReview(payload),
            'payment.dispute.action_required': () => this.handleDisputeActionRequired(payload),

            // ========== Downtime Events ==========
            'payment.downtime.started': () => this.handleDowntimeStarted(payload),
            'payment.downtime.updated': () => this.handleDowntimeUpdated(payload),
            'payment.downtime.resolved': () => this.handleDowntimeResolved(payload),
        };

        const handler = handlers[event];

        if (handler) {
            await handler();
        } else {
            console.log(`[Razorpay Webhook] Unhandled event: ${event}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAYMENT EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Payment authorized - funds are blocked on customer's account
     * For subscriptions, this usually precedes capture
     */
    private async handlePaymentAuthorized(payload: WebhookPayload): Promise<void> {
        const payment = payload.payload.payment?.entity;
        if (!payment) return;

        console.log(`[Razorpay] Payment authorized: ${payment.id}, Amount: ₹${payment.amount / 100}`);

        // Find payment record by order_id or subscription
        const paymentRecord = await this.findPaymentByOrderOrPaymentId(payment);
        
        if (paymentRecord) {
            paymentRecord.status = 'authorized';
            paymentRecord.gatewayPaymentId = payment.id;
            paymentRecord.totalAmount = payment.amount;
            paymentRecord.currency = payment.currency;
            paymentRecord.paymentMethod = payment.method;
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                authorizedAt: new Date().toISOString(),
                email: payment.email,
                contact: payment.contact,
            };
            await paymentRecord.save();
        }

        // Note: For auto-capture (default in Razorpay), payment.captured follows immediately
        // For manual capture, you need to call razorpay.payments.capture()
    }

    /**
     * Payment captured - funds are transferred to your account
     * This is when the payment is actually complete
     */
    private async handlePaymentCaptured(payload: WebhookPayload): Promise<void> {
        const payment = payload.payload.payment?.entity;
        if (!payment) return;

        console.log(`[Razorpay] Payment captured: ${payment.id}, Amount: ₹${payment.amount / 100}`);

        const paymentRecord = await this.findPaymentByOrderOrPaymentId(payment);

        if (paymentRecord) {
            paymentRecord.status = 'captured';
            paymentRecord.gatewayPaymentId = payment.id;
            paymentRecord.totalAmount = payment.amount;
            paymentRecord.currency = payment.currency;
            paymentRecord.paymentMethod = payment.method;
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                capturedAt: new Date().toISOString(),
                fee: payment.fee,
                tax: payment.tax,
            };
            await paymentRecord.save();

            // For one-time payments (orders), activate the plan here
            // For subscriptions, activation happens via subscription.activated webhook
            if (!paymentRecord.gatewaySubscriptionId) {
                await this.activateUserPlanFromPayment(paymentRecord);
            }
        }
    }

    /**
     * Payment failed - payment was unsuccessful
     */
    private async handlePaymentFailed(payload: WebhookPayload): Promise<void> {
        const payment = payload.payload.payment?.entity;
        if (!payment) return;

        console.log(`[Razorpay] Payment FAILED: ${payment.id}`);
        console.log(`[Razorpay] Error: ${payment.error_code} - ${payment.error_description}`);

        const paymentRecord = await this.findPaymentByOrderOrPaymentId(payment);

        if (paymentRecord) {
            paymentRecord.status = 'failed';
            paymentRecord.gatewayPaymentId = payment.id;
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                failedAt: new Date().toISOString(),
                errorCode: payment.error_code,
                errorDescription: payment.error_description,
                errorSource: payment.error_source,
                errorStep: payment.error_step,
                errorReason: payment.error_reason,
            };
            await paymentRecord.save();

            // Notify user about failed payment
            await this.notifyUserPaymentFailed(paymentRecord, payment);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPUTE EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Dispute created - customer raised a chargeback/dispute
     */
    private async handleDisputeCreated(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[Razorpay] 🚨 Dispute CREATED: ${dispute.id}`);
        console.log(`[Razorpay] Payment: ${dispute.payment_id}, Amount: ₹${dispute.amount / 100}`);
        console.log(`[Razorpay] Reason: ${dispute.reason_code} - ${dispute.reason_description}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeId: dispute.id,
            disputeStatus: 'created',
            disputeReason: dispute.reason_description,
            disputeReasonCode: dispute.reason_code,
            disputeAmount: dispute.amount,
            disputePhase: dispute.phase,
            respondBy: new Date(dispute.respond_by * 1000).toISOString(),
            createdAt: new Date().toISOString(),
        });

        // URGENT: Notify admin
        await this.notifyAdminDispute(dispute, 'created');
    }

    /**
     * Dispute won - you won the dispute, funds returned
     */
    private async handleDisputeWon(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[Razorpay] ✅ Dispute WON: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'won',
            resolvedAt: new Date().toISOString(),
        });

        await this.notifyAdminDispute(dispute, 'won');
    }

    /**
     * Dispute lost - customer won, funds deducted from your account
     */
    private async handleDisputeLost(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[Razorpay] ❌ Dispute LOST: ${dispute.id}`);
        console.log(`[Razorpay] Amount deducted: ₹${dispute.amount_deducted / 100}`);

        const paymentRecord = await PaymentEntity.findOne({ gatewayPaymentId: dispute.payment_id });

        if (paymentRecord) {
            paymentRecord.status = 'disputed_lost';
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                dispute: {
                    ...paymentRecord.metadata?.dispute,
                    disputeStatus: 'lost',
                    amountDeducted: dispute.amount_deducted,
                    resolvedAt: new Date().toISOString(),
                },
            };
            await paymentRecord.save();

            // Take action: flag user, potentially suspend plan
            await this.handleDisputeLostAction(paymentRecord, dispute);
        }

        await this.notifyAdminDispute(dispute, 'lost');
    }

    /**
     * Dispute closed - dispute resolved without winner/loser
     */
    private async handleDisputeClosed(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[Razorpay] Dispute CLOSED: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'closed',
            resolvedAt: new Date().toISOString(),
        });

        await this.notifyAdminDispute(dispute, 'closed');
    }

    /**
     * Dispute under review - Razorpay/bank is reviewing
     */
    private async handleDisputeUnderReview(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[Razorpay] Dispute UNDER REVIEW: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'under_review',
        });

        await this.notifyAdminDispute(dispute, 'under_review');
    }

    /**
     * Dispute action required - YOU NEED TO RESPOND
     */
    private async handleDisputeActionRequired(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[Razorpay] 🚨🚨 Dispute ACTION REQUIRED: ${dispute.id}`);
        console.log(`[Razorpay] Respond by: ${new Date(dispute.respond_by * 1000).toLocaleString()}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'action_required',
            respondBy: new Date(dispute.respond_by * 1000).toISOString(),
        });

        // URGENT: This needs immediate attention
        await this.notifyAdminDispute(dispute, 'action_required', true);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DOWNTIME EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Payment downtime started - a payment method is experiencing issues
     */
    private async handleDowntimeStarted(payload: WebhookPayload): Promise<void> {
        const downtime = payload.payload.downtime?.entity;
        if (!downtime) return;

        const severityEmoji = downtime.severity === 'high' ? '🔴' : downtime.severity === 'medium' ? '🟠' : '🟡';
        
        console.log(`[Razorpay] ${severityEmoji} Downtime STARTED: ${downtime.id}`);
        console.log(`[Razorpay] Method: ${downtime.method}, Severity: ${downtime.severity}`);
        console.log(`[Razorpay] Instrument:`, downtime.instrument);

        await this.logDowntime(downtime, 'started');
        await this.notifyAdminDowntime(downtime, 'started');
    }

    /**
     * Payment downtime updated - status changed
     */
    private async handleDowntimeUpdated(payload: WebhookPayload): Promise<void> {
        const downtime = payload.payload.downtime?.entity;
        if (!downtime) return;

        console.log(`[Razorpay] Downtime UPDATED: ${downtime.id}`);

        await this.logDowntime(downtime, 'updated');
    }

    /**
     * Payment downtime resolved - issue fixed
     */
    private async handleDowntimeResolved(payload: WebhookPayload): Promise<void> {
        const downtime = payload.payload.downtime?.entity;
        if (!downtime) return;

        console.log(`[Razorpay] 🟢 Downtime RESOLVED: ${downtime.id}`);

        await this.logDowntime(downtime, 'resolved');
        await this.notifyAdminDowntime(downtime, 'resolved');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SUBSCRIPTION EVENT HANDLERS (existing)
    // ══════════════════════════════════════════════════════════════════════════

    private async handleSubscriptionAuthenticated(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatusBySubscription(subscription.id, 'authenticated');
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

        paymentRecord.gatewayPaymentId = payment?.id;
        paymentRecord.status = 'completed';
        paymentRecord.metadata = {
            ...paymentRecord.metadata,
            lastChargedAt: new Date().toISOString(),
            chargeCount: (paymentRecord.metadata?.chargeCount || 0) + 1
        };
        await paymentRecord.save();

        await this.activateUserPlan(paymentRecord, subscription);
        console.log(`[Razorpay] Subscription charged: ${subscription.id}`);
    }

    private async handleSubscriptionPending(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatusBySubscription(subscription.id, 'pending');
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

        await this.updatePaymentStatusBySubscription(subscription.id, 'expired');
        console.log(`[Razorpay] Subscription expired: ${subscription.id}`);
    }

    private async handleSubscriptionPaused(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatusBySubscription(subscription.id, 'paused');
        await this.updateUserSubscriptionStatus(subscription.id, false, 'paused');
        console.log(`[Razorpay] Subscription paused: ${subscription.id}`);
    }

    private async handleSubscriptionResumed(payload: WebhookPayload): Promise<void> {
        const subscription = payload.payload.subscription?.entity;
        if (!subscription) return;

        await this.updatePaymentStatusBySubscription(subscription.id, 'active');
        await this.updateUserSubscriptionStatus(subscription.id, true, 'active');
        console.log(`[Razorpay] Subscription resumed: ${subscription.id}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ══════════════════════════════════════════════════════════════════════════

    // ----- Payment Helpers -----

    private async findPaymentByOrderOrPaymentId(payment: RazorpayPaymentEntity): Promise<IPayment | null> {
        // Try to find by order_id first
        if (payment.order_id) {
            const record = await PaymentEntity.findOne({ gatewayOrderId: payment.order_id });
            if (record) return record;
        }

        // Try by payment_id
        const record = await PaymentEntity.findOne({ gatewayPaymentId: payment.id });
        if (record) return record;

        // Try by notes (if payment has internal reference)
        const notes = (payment as any).notes;
        if (notes?.paymentRecordId) {
            return PaymentEntity.findById(notes.paymentRecordId);
        }

        return null;
    }

    private async activateUserPlanFromPayment(paymentRecord: IPayment): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const planId = paymentRecord.planId;
        const isOwner = planId.startsWith('owner_');

        // Set plan expiry to 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        if (isOwner) {
            await Owner.findOneAndUpdate(
                { userId },
                {
                    planId,
                    planActivatedAt: new Date(),
                    planExpiresAt: expiresAt,
                    autoRenew: false, // One-time payment
                }
            );
            await activateOwnerBusinessLogic(paymentRecord);
        } else {
            await User.findByIdAndUpdate(userId, {
                planId,
                planActivatedAt: new Date(),
                planExpiresAt: expiresAt,
                autoRenew: false,
            });
            await activateTenantBusinessLogic(paymentRecord);
        }
    }

    private async notifyUserPaymentFailed(paymentRecord: IPayment, payment: RazorpayPaymentEntity): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const user = await User.findById(userId);

        if (user?.deviceToken) {
            try {
                // Import your notification utility
                await sendPushNotification(user.deviceToken, 'Payment Failed', 'Your payment could not be processed. Please try again.');
                console.log(`[Razorpay] Would notify user ${userId} about payment failure`);
            } catch (err) {
                console.error('[Razorpay] Failed to send payment failure notification', err);
            }
        }
    }

    // ----- Dispute Helpers -----

    private async updatePaymentWithDispute(paymentId: string, disputeData: Record<string, any>): Promise<void> {
        await PaymentEntity.updateOne(
            { gatewayPaymentId: paymentId },
            {
                $set: {
                    'metadata.dispute': {
                        ...disputeData,
                        updatedAt: new Date().toISOString(),
                    },
                },
            }
        );
    }

    private async handleDisputeLostAction(paymentRecord: IPayment, dispute: RazorpayDisputeEntity): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const isOwner = paymentRecord.planId.startsWith('owner_');

        // Flag the user account
        const flagData = {
            'flags.hasDisputeLost': true,
            'flags.lastDisputeId': dispute.id,
            'flags.lastDisputePaymentId': dispute.payment_id,
            'flags.lastDisputeAmount': dispute.amount_deducted,
            'flags.lastDisputeAt': new Date(),
        };

        if (isOwner) {
            await Owner.findOneAndUpdate({ userId }, { $set: flagData });
        } else {
            await User.findByIdAndUpdate(userId, { $set: flagData });
        }

        console.log(`[Razorpay] User ${userId} flagged for lost dispute`);
    }

    private async notifyAdminDispute(
        dispute: RazorpayDisputeEntity, 
        status: string, 
        urgent: boolean = false
    ): Promise<void> {
        const urgentFlag = urgent ? '🚨 URGENT ' : '';
        const statusEmoji = {
            'created': '⚠️',
            'won': '✅',
            'lost': '❌',
            'closed': '📁',
            'under_review': '🔍',
            'action_required': '🚨',
        }[status] || '📋';

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║ ${urgentFlag}${statusEmoji} DISPUTE ${status.toUpperCase()}
╠══════════════════════════════════════════════════════════════════╣
║ Dispute ID:    ${dispute.id}
║ Payment ID:    ${dispute.payment_id}
║ Amount:        ₹${(dispute.amount / 100).toFixed(2)}
║ Reason:        ${dispute.reason_code} - ${dispute.reason_description}
║ Phase:         ${dispute.phase}
║ Respond By:    ${new Date(dispute.respond_by * 1000).toLocaleString()}
╚══════════════════════════════════════════════════════════════════╝
        `);

        // TODO: Integrate with your notification system
        // await sendSlackNotification({ ... });
        // await sendEmailToAdmin({ ... });
    }

    // ----- Downtime Helpers -----

    private async logDowntime(downtime: RazorpayDowntimeEntity, eventType: string): Promise<void> {
        const log = {
            downtimeId: downtime.id,
            eventType,
            method: downtime.method,
            severity: downtime.severity,
            status: downtime.status,
            scheduled: downtime.scheduled,
            begin: downtime.begin ? new Date(downtime.begin * 1000).toISOString() : null,
            end: downtime.end ? new Date(downtime.end * 1000).toISOString() : null,
            instrument: downtime.instrument,
            loggedAt: new Date().toISOString(),
        };

        console.log(`[Razorpay] Downtime Log:`, JSON.stringify(log, null, 2));

        // TODO: Store in database if needed
        // await DowntimeLog.create(log);
    }

    private async notifyAdminDowntime(downtime: RazorpayDowntimeEntity, status: 'started' | 'resolved'): Promise<void> {
        const emoji = status === 'started' ? '🔴' : '🟢';
        const severityEmoji = {
            'high': '🚨',
            'medium': '⚠️',
            'low': 'ℹ️',
        }[downtime.severity] || '📋';

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║ ${emoji} ${severityEmoji} PAYMENT DOWNTIME ${status.toUpperCase()}
╠══════════════════════════════════════════════════════════════════╣
║ Downtime ID:   ${downtime.id}
║ Method:        ${downtime.method}
║ Severity:      ${downtime.severity}
║ Scheduled:     ${downtime.scheduled ? 'Yes' : 'No'}
║ Begin:         ${downtime.begin ? new Date(downtime.begin * 1000).toLocaleString() : 'N/A'}
║ End:           ${downtime.end ? new Date(downtime.end * 1000).toLocaleString() : 'Ongoing'}
║ Instrument:    ${JSON.stringify(downtime.instrument || 'All')}
╚══════════════════════════════════════════════════════════════════╝
        `);
    }

    // ----- Subscription Helpers -----

    private async findPaymentBySubscription(subscriptionId: string): Promise<IPayment | null> {
        return PaymentEntity.findOne({ gatewaySubscriptionId: subscriptionId });
    }

    private async updatePaymentStatusBySubscription(subscriptionId: string, status: string): Promise<void> {
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
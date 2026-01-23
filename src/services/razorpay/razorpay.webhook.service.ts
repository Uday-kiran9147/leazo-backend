// ============================================================================
// FILE: src/services/razorpay/razorpay.webhook.service.ts
// Purpose: Webhook handling for order-based payments
// ============================================================================

import Razorpay from 'razorpay';
import { PaymentEntity, IPayment } from '../../payments/payments.models';
import { activateOwnerBusinessLogic, activateTenantBusinessLogic } from '../../payments/payment_logic';
import { Owner } from '../../models/owner.model';
import { User } from '../../models/user.model';
import { 
    WebhookPayload, 
    RazorpayPaymentEntity,
    RazorpayOrderEntity,
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
        const { event, payload: data } = payload;
        const entityId = data.order?.entity?.id || data.payment?.entity?.id || data.refund?.entity?.id || data.dispute?.entity?.id || 'N/A';
        console.log(`[RZP-WH] 📥 ${event} (ID: ${entityId})`);

        const handlers: Record<string, () => Promise<void>> = {
            // ========== Order Events ==========
            'order.paid': () => this.handleOrderPaid(payload),

            // ========== Payment Events ==========
            'payment.authorized': () => this.handlePaymentAuthorized(payload),
            'payment.captured': () => this.handlePaymentCaptured(payload),
            'payment.failed': () => this.handlePaymentFailed(payload),

            // ========== Refund Events ==========
            'refund.created': () => this.handleRefundCreated(payload),
            'refund.processed': () => this.handleRefundProcessed(payload),
            'refund.failed': () => this.handleRefundFailed(payload),

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
            console.log(`[RZP-WH] ⚠️ Unhandled event: ${event}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ORDER EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Order paid - order has been paid successfully
     * This is the primary event for order completion
     */
    private async handleOrderPaid(payload: WebhookPayload): Promise<void> {
        const order = payload.payload.order?.entity;
        const payment = payload.payload.payment?.entity;
        if (!order) return;

        console.log(`[RZP-WH] ✅ Order PAID: ${order.id} | ₹${order.amount / 100} | ${order.status}`);

        const paymentRecord = await this.findPaymentByOrderId(order.id);

        if (paymentRecord) {
            if (paymentRecord.status === 'completed') {
                console.log(`[RZP-WH] Order ${order.id} already processed (completed), skipping duplication.`);
                return;
            }
            const previousStatus = paymentRecord.status;
            paymentRecord.status = 'completed';
            paymentRecord.gatewayPaymentId = payment?.id;
            paymentRecord.totalAmount = order.amount;
            paymentRecord.settlementAmount = order.amount_paid;
            paymentRecord.currency = order.currency;
            paymentRecord.paymentMethod = payment?.method;
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                orderStatus: order.status,
                paidAt: new Date().toISOString(),
                attempts: order.attempts,
            };
            await paymentRecord.save();
            console.log(`[RZP-WH] Record ${paymentRecord._id} updated: ${previousStatus} -> completed`);

            // Activate the user's plan (this sends the success notification internally)
            await this.activateUserPlan(paymentRecord);
            return;
        } else {
            console.error(`[RZP-WH] ❌ No payment record found for order: ${order.id}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAYMENT EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Payment authorized - funds blocked on customer's account
     */
    private async handlePaymentAuthorized(payload: WebhookPayload): Promise<void> {
        const payment = payload.payload.payment?.entity;
        if (!payment) return;

        console.log(`[RZP-WH] Payment AUTHORIZED: ${payment.id} | ₹${payment.amount / 100} | ${payment.method}`);

        const paymentRecord = await this.findPaymentByOrderId(payment.order_id);

        if (paymentRecord) {
            const previousStatus = paymentRecord.status;
            paymentRecord.status = 'authorized';
            paymentRecord.gatewayPaymentId = payment.id;
            paymentRecord.totalAmount = payment.amount;
            paymentRecord.currency = payment.currency;
            paymentRecord.paymentMethod = payment.method;
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                email: payment.email,
                contact: payment.contact,
            };
            await paymentRecord.save();
            console.log(`[RZP-WH] Record ${paymentRecord._id} updated: ${previousStatus} -> authorized`);
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Order ID: ${payment.order_id} (authorized)`);
        }

        // Note: If auto-capture is enabled (default), payment.captured will follow
    }

    /**
     * Payment captured - funds transferred to your account
     * THIS IS THE MAIN SUCCESS EVENT
     */
    private async handlePaymentCaptured(payload: WebhookPayload): Promise<void> {
        const payment = payload.payload.payment?.entity;
        if (!payment) return;

        console.log(`[RZP-WH] ✅ Payment CAPTURED: ${payment.id} | ₹${payment.amount / 100} | ${payment.method}`);

        const paymentRecord = await this.findPaymentByOrderId(payment.order_id);

        if (paymentRecord) {
            // Only process if not already completed (order.paid might have processed it)
            if (paymentRecord.status !== 'completed') {
                const previousStatus = paymentRecord.status;
                paymentRecord.status = 'completed';
                paymentRecord.gatewayPaymentId = payment.id;
                paymentRecord.totalAmount = payment.amount;
                paymentRecord.currency = payment.currency;
                paymentRecord.paymentMethod = payment.method;
                paymentRecord.metadata = {
                    ...paymentRecord.metadata,
                    fee: payment.fee,
                    tax: payment.tax,
                };
                await paymentRecord.save();
                console.log(`[RZP-WH] Record ${paymentRecord._id} updated: ${previousStatus} -> completed (captured)`);

                // Activate the user's plan (this sends the success notification internally)
                await this.activateUserPlan(paymentRecord);
            } else {
                console.log(`[RZP-WH] Payment ${payment.id} already completed, skipping.`);
            }
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Order ID: ${payment.order_id} (captured)`);
        }
    }

    /**
     * Payment failed - payment unsuccessful
     */
    private async handlePaymentFailed(payload: WebhookPayload): Promise<void> {
        const payment = payload.payload.payment?.entity;
        if (!payment) return;

        console.log(`[RZP-WH] ❌ Payment FAILED: ${payment.id} | ${payment.error_code}: ${payment.error_description}`);

        const paymentRecord = await this.findPaymentByOrderId(payment.order_id);

        if (paymentRecord) {
            const previousStatus = paymentRecord.status;
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
            console.log(`[RZP-WH] Record ${paymentRecord._id} updated: ${previousStatus} -> failed`);

            // Notify user about failed payment
            await this.notifyUserPaymentFailed(paymentRecord, payment);
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Order ID: ${payment.order_id} (failed)`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REFUND EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Refund created
     */
    private async handleRefundCreated(payload: WebhookPayload): Promise<void> {
        const refund = (payload.payload as any).refund?.entity;
        const payment = payload.payload.payment?.entity;
        if (!refund) return;

        console.log(`[RZP-WH] Refund CREATED: ${refund.id} | ₹${refund.amount / 100} | Parent: ${refund.payment_id}`);

        const paymentRecord = await PaymentEntity.findOne({ gatewayPaymentId: refund.payment_id });

        if (paymentRecord) {
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                refund: {
                    refundId: refund.id,
                    amount: refund.amount,
                    status: 'created',
                    createdAt: new Date().toISOString(),
                },
            };
            await paymentRecord.save();
            console.log(`[RZP-WH] Refund ${refund.id} recorded for Payment ${paymentRecord.gatewayPaymentId}`);
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Payment ID: ${refund.payment_id} (refund created)`);
        }
    }

    /**
     * Refund processed successfully
     */
    private async handleRefundProcessed(payload: WebhookPayload): Promise<void> {
        const refund = (payload.payload as any).refund?.entity;
        if (!refund) return;

        console.log(`[RZP-WH] ✅ Refund PROCESSED: ${refund.id}`);

        const paymentRecord = await PaymentEntity.findOne({ gatewayPaymentId: refund.payment_id });

        if (paymentRecord) {
            // Check if full refund
            const isFullRefund = refund.amount === paymentRecord.totalAmount;
            const previousStatus = paymentRecord.status;

            paymentRecord.status = isFullRefund ? 'refunded' : 'partially_refunded';
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                refund: {
                    ...paymentRecord.metadata?.refund,
                    status: 'processed',
                    processedAt: new Date().toISOString(),
                },
            };
            await paymentRecord.save();
            console.log(`[RZP-WH] Record ${paymentRecord._id} updated: ${previousStatus} -> ${paymentRecord.status} (refunded)`);

            // If full refund, deactivate user's plan
            if (isFullRefund) {
                console.log(`[RZP-WH] Full refund. Deactivating plan for user: ${paymentRecord.userId}`);
                await this.deactivateUserPlan(paymentRecord);

                // Only send refund notification if status changed to refunded just now
                if (previousStatus !== 'refunded') {
                    await this.notifyUserRefundProcessed(paymentRecord, refund.amount);
                }
            } else {
                console.log(`[RZP-WH] Partial refund of ₹${refund.amount / 100} processed.`);
            }
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Payment ID: ${refund.payment_id} (refund processed)`);
        }
    }

    /**
     * Refund failed
     */
    private async handleRefundFailed(payload: WebhookPayload): Promise<void> {
        const refund = (payload.payload as any).refund?.entity;
        if (!refund) return;

        console.log(`[RZP-WH] ❌ Refund FAILED: ${refund.id}`);

        const paymentRecord = await PaymentEntity.findOne({ gatewayPaymentId: refund.payment_id });

        if (paymentRecord) {
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                refund: {
                    ...paymentRecord.metadata?.refund,
                    status: 'failed',
                    failedAt: new Date().toISOString(),
                },
            };
            await paymentRecord.save();
            console.log(`[RZP-WH] Refund ${refund.id} marked FAILED for Payment ${paymentRecord.gatewayPaymentId}`);
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Payment ID: ${refund.payment_id} (refund failed)`);
        }

        // Notify admin about failed refund
        console.log(`[RZP-WH] 🚨 ADMIN ALERT: Refund failed for payment ${refund.payment_id}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPUTE EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    private async handleDisputeCreated(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[RZP-WH] 🚨 Dispute CREATED: ${dispute.id}`);

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

        await this.notifyAdminDispute(dispute, 'created');
    }

    private async handleDisputeWon(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[RZP-WH] ✅ Dispute WON: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'won',
            resolvedAt: new Date().toISOString(),
        });

        await this.notifyAdminDispute(dispute, 'won');
    }

    private async handleDisputeLost(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[RZP-WH] ❌ Dispute LOST: ${dispute.id}`);

        const paymentRecord = await PaymentEntity.findOne({ gatewayPaymentId: dispute.payment_id });

        if (paymentRecord) {
            const previousStatus = paymentRecord.status;
            paymentRecord.status = 'disputed_lost';
            paymentRecord.metadata = {
                ...paymentRecord.metadata,
                dispute: {
                    disputeStatus: 'lost',
                    amountDeducted: dispute.amount_deducted,
                    resolvedAt: new Date().toISOString(),
                },
            };
            await paymentRecord.save();
            console.log(`[RZP-WH] Record ${paymentRecord._id} updated: ${previousStatus} -> disputed_lost`);

            // Deactivate user's plan and flag account
            console.log(`[RZP-WH] Dispute lost. Deactivating plan for user: ${paymentRecord.userId}`);
            await this.deactivateUserPlan(paymentRecord);
            await this.flagUserForDispute(paymentRecord, dispute);
        } else {
            console.warn(`[RZP-WH] ⚠️ No payment record found for Payment ID: ${dispute.payment_id} (dispute lost)`);
        }

        await this.notifyAdminDispute(dispute, 'lost');
    }

    private async handleDisputeClosed(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[RZP-WH] Dispute CLOSED: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'closed',
            resolvedAt: new Date().toISOString(),
        });

        await this.notifyAdminDispute(dispute, 'closed');
    }

    private async handleDisputeUnderReview(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[RZP-WH] Dispute UNDER REVIEW: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'under_review',
        });

        await this.notifyAdminDispute(dispute, 'under_review');
    }

    private async handleDisputeActionRequired(payload: WebhookPayload): Promise<void> {
        const dispute = payload.payload.dispute?.entity;
        if (!dispute) return;

        console.log(`[RZP-WH] 🚨🚨 Dispute ACTION REQUIRED: ${dispute.id}`);

        await this.updatePaymentWithDispute(dispute.payment_id, {
            disputeStatus: 'action_required',
            respondBy: new Date(dispute.respond_by * 1000).toISOString(),
        });

        await this.notifyAdminDispute(dispute, 'action_required', true);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DOWNTIME EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    private async handleDowntimeStarted(payload: WebhookPayload): Promise<void> {
        const downtime = payload.payload.downtime?.entity;
        if (!downtime) return;

        const severityEmoji = downtime.severity === 'high' ? '🔴' : downtime.severity === 'medium' ? '🟠' : '🟡';
        console.log(`[RZP-WH] ${severityEmoji} Downtime STARTED: ${downtime.method}`);

        await this.logDowntime(downtime, 'started');
        await this.notifyAdminDowntime(downtime, 'started');
    }

    private async handleDowntimeUpdated(payload: WebhookPayload): Promise<void> {
        const downtime = payload.payload.downtime?.entity;
        if (!downtime) return;

        console.log(`[RZP-WH] Downtime UPDATED: ${downtime.id}`);
        await this.logDowntime(downtime, 'updated');
    }

    private async handleDowntimeResolved(payload: WebhookPayload): Promise<void> {
        const downtime = payload.payload.downtime?.entity;
        if (!downtime) return;

        console.log(`[RZP-WH] 🟢 Downtime RESOLVED: ${downtime.id}`);
        await this.logDowntime(downtime, 'resolved');
        await this.notifyAdminDowntime(downtime, 'resolved');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - PAYMENT/ORDER
    // ══════════════════════════════════════════════════════════════════════════

    private async findPaymentByOrderId(orderId: string | null): Promise<IPayment | null> {
        if (!orderId) return null;
        return PaymentEntity.findOne({ orderId });
    }

    /**
     * Activate user's plan after successful payment
     */
    private async activateUserPlan(paymentRecord: IPayment): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const planId = paymentRecord.planId;
        const isOwner = planId.startsWith('owner_');

        // Set plan expiry to 30 days from now
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 30);

        console.log(`[RZP-WH] Activating plan ${planId} for user ${userId}`);

        if (isOwner) {
            await activateOwnerBusinessLogic(paymentRecord);
        } else {
            await activateTenantBusinessLogic(paymentRecord);
        }

        console.log(`[RZP-WH] Plan ${planId} activated until ${expiresAt.toISOString()}`);
    }

    /**
     * Deactivate user's plan (on refund or dispute lost)
     */
    private async deactivateUserPlan(paymentRecord: IPayment): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const isOwner = paymentRecord.planId.startsWith('owner_');
        const fallbackPlan = isOwner ? 'owner_free' : 'tenant_free';

        console.log(`[RZP-WH] Deactivating plan for user ${userId}, falling back to ${fallbackPlan}`);

        if (isOwner) {
            await activateOwnerBusinessLogic(null, userId, fallbackPlan);
        } else {
            await activateTenantBusinessLogic(null, userId, fallbackPlan);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @deprecated Success notifications are now handled within business logic activation
     */
    // private async notifyUserPaymentSuccess(paymentRecord: IPayment): Promise<void> { ... }

    private async notifyUserPaymentFailed(paymentRecord: IPayment, payment: RazorpayPaymentEntity): Promise<void> {
        try {
            const userId = paymentRecord.userId.toString();
            const user = await User.findById(userId);

            if (user?.deviceToken) {
                await sendPushNotification(
                    user.deviceToken,
                    'Payment Failed',
                    'Your payment could not be processed. Please try again.'
                );
            }
        } catch (err) {
            console.error('[RZP-WH] ❌ Failed to send failure notification', err);
        }
    }

    private async notifyUserRefundProcessed(paymentRecord: IPayment, amount: number): Promise<void> {
        try {
            const userId = paymentRecord.userId.toString();
            const user = await User.findById(userId);

            if (user?.deviceToken) {
                await sendPushNotification(
                    user.deviceToken,
                    'Refund Processed',
                    `Your refund of ₹${amount / 100} has been processed successfully.`
                );
            }
        } catch (err) {
            console.error('[RZP-WH] ❌ Failed to send refund notification', err);
        }
    }

    private getPlanDisplayName(planId: string): string {
        const names: Record<string, string> = {
            'owner_starter': 'Starter',
            'owner_pro': 'Pro',
            'owner_ultra': 'Ultra',
            'tenant_smart_finder': 'Smart Finder',
            'tenant_premium': 'Premium',
        };
        return names[planId] || planId;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - DISPUTES
    // ══════════════════════════════════════════════════════════════════════════

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

    private async flagUserForDispute(paymentRecord: IPayment, dispute: RazorpayDisputeEntity): Promise<void> {
        const userId = paymentRecord.userId.toString();
        const isOwner = paymentRecord.planId.startsWith('owner_');

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

        console.log(`[RZP-WH] User ${userId} flagged for lost dispute`);
    }

    private async notifyAdminDispute(
        dispute: RazorpayDisputeEntity, 
        status: string, 
        urgent: boolean = false
    ): Promise<void> {
        const urgentFlag = urgent ? '🚨 URGENT ' : '';
        const statusEmoji: Record<string, string> = {
            'created': '⚠️',
            'won': '✅',
            'lost': '❌',
            'closed': '📁',
            'under_review': '🔍',
            'action_required': '🚨',
        };

        const emoji = statusEmoji[status] || '📋';
        console.log(`[RZP-WH] ${urgentFlag}${emoji} DISPUTE ${status.toUpperCase()} | ID: ${dispute.id} | Amount: ₹${(dispute.amount / 100).toFixed(2)} | Reason: ${dispute.reason_code}`);

        // TODO: Integrate with Slack/Email notifications
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS - DOWNTIME
    // ══════════════════════════════════════════════════════════════════════════

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

        console.log(`[RZP-WH] Downtime Log: ${eventType} | ${downtime.method} | Severity: ${downtime.severity}`);
    }

    private async notifyAdminDowntime(downtime: RazorpayDowntimeEntity, status: 'started' | 'resolved'): Promise<void> {
        const emoji = status === 'started' ? '🔴' : '🟢';
        const severityEmoji: Record<string, string> = {
            'high': '🚨',
            'medium': '⚠️',
            'low': 'ℹ️',
        };

        const sEmoji = severityEmoji[downtime.severity] || '📋';
        console.log(`[RZP-WH] ${emoji} ${sEmoji} PAYMENT DOWNTIME ${status.toUpperCase()} | ID: ${downtime.id} | Method: ${downtime.method} | Severity: ${downtime.severity}`);
    }
}

// Export singleton instance
export const webhookService = new RazorpayWebhookService();
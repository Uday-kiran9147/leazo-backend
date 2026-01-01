import { IPayment, PaymentEntity } from "./payments.models";
import { Request, Response } from "express";
import { Owner } from "../models/owner.model";
import { dodosession } from "./dodo_payments_strategy";
import { Portion } from "../models/portion.model";
import { getPlanRules } from "../config/ownerConfig";
import { RedisClientManager } from "../cache/RedisClientManager";
import { sendPushNotification } from "../utils/push_notifications";
import { User } from "../models/user.model";
import { getTenantPlanRules } from "../config/tenantConfig";
import { Notification } from "../models/notification.model";
import mongoose from "mongoose";


const activateTenantBusinessLogic = async (payment: IPayment | null, userId?: string, planIdStr?: string) => {
    console.log("Activating tenant business logic");

    let user;
    if (payment) {
        user = await User.findById(payment.userId);
    } else if (userId) {
        user = await User.findById(userId);
    }

    if (!user) {
        throw new Error("User not found for tenant activation");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const planId = (payment ? payment.planId : planIdStr) as "tenant_free" | "tenant_smart_finder" | "tenant_premium";
    const plan = getTenantPlanRules(planId);

    console.log("Updating tenant plan details for user:", user._id);
    await User.updateOne(
        { _id: user._id },
        {
            planId: planId,
            planActivatedAt: now,
            planExpiresAt: expiresAt,
            autoRenew: true, // Typically true for subscriptions
            "usage.ownerContactsUsed": 0 // Reset usage on plan activation/renewal
        }
    );

    // Invalidate user cache
    await RedisClientManager.delete(`user:${user._id}`);
    await RedisClientManager.delete("users:all");

    await sendTenantNotification(user._id.toString(), planId);
};

const sendTenantNotification = async (userId: string, planId: string) => {
    const user = await User.findById(userId);
    if (user && user.deviceToken) {
        console.log("Sending tenant notification to user:", user._id);
        let title = "Tenant Plan Activated";
        let body = "Your tenant subscription has been successfully updated.";

        switch (planId) {
            case "tenant_free":
                title = "Free Plan Active";
                body = "Your account is now on the Free tenant plan.";
                break;
            case "tenant_smart_finder":
                title = "Smart Finder Active! 🔍";
                body = "Your Smart Finder plan is now active. Start finding your perfect home!";
                break;
            case "tenant_premium":
                title = "Premium Plan Active! ✨";
                body = "You're now on the Premium tenant plan! Enjoy all exclusive features.";
                break;
        }

        if (user.deviceToken) {
            try {
                await sendPushNotification(user.deviceToken, title, body);
            } catch (err) {
                console.error("Failed to send push notification to tenant", err);
            }
        }
        try {
            await (Notification as any).createNotification(user._id, title, body, "success");
        } catch (err) {
            console.error("Failed to create internal notification", err);
        }
    }
};

const activateOwnerBusinessLogic = async (payment: IPayment | null, ownerId?: string, planIdStr?: string) => {
    console.log("Activating Owner business logic");
    if (payment) {
        console.log("Activating business logic for payment:", payment._id);
    }

    let owner;
    if (payment) {
        owner = await Owner.findOne({ userId: payment.userId });
    } else if (ownerId) {
        owner = await Owner.findById(ownerId);
    }

    if (!owner) {
        throw new Error("Owner not found for user");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const planId = (payment ? payment.planId : planIdStr) as "owner_free" | "owner_starter" | "owner_pro" | "owner_ultra";
    const plan = getPlanRules(planId);

    // Get all portions for the owner
    // Sort by updatedAt in descending order
    // set only isActive to true as per plan activeListings
    const ownerPortions = await Portion.find({ ownerId: owner._id }).sort({ updatedAt: -1 });
    const portions = ownerPortions;

    const bulkOps = [];
    let activeCount = 0;
    const buildingIds = new Set<string>();

    for (const portion of portions) {
        // if activeListings is -1 (i.e. unlimited), set all portions to active
        const shouldBeActive = plan.activeListings === -1 || activeCount < plan.activeListings;

        if (shouldBeActive) activeCount++;
        console.log(`Portion ${portion.title} should be active:`, shouldBeActive);
        bulkOps.push({
            updateOne: {
                filter: { _id: portion._id },
                update: { isActive: shouldBeActive }
            }
        });
        buildingIds.add(portion.buildingId.toString());
    }

    if (bulkOps.length > 0) {
        console.log("Updating portions in bulk:", bulkOps.length);
        await Portion.bulkWrite(bulkOps);
    }

    const redis = RedisClientManager.getInstance();
    if (redis) {
        const pipeline = redis.pipeline();
        for (const portion of portions) {
            console.log("Invalidating cache for portion:", portion._id);
            pipeline.del(`portion:${portion._id}`);
        }
        await pipeline.exec();
    }

    for (const buildingId of buildingIds) {
        console.log("Invalidating cache for building portions:", buildingId);
        await RedisClientManager.deletePattern(`building-portions:${buildingId}:*`);
    }

    console.log("Updating owner plan details");
    await Owner.updateOne(
        { _id: owner._id },
        {
            planId: planId,
            planActivatedAt: now,
            planExpiresAt: expiresAt,
            verifiedBadge: plan.verifiedBadge,
            visibility: plan.visibility,
            autoRenew: plan.autoRenew,
            "usage.activeListings": activeCount,
            "usage.weeklyBoostsUsed": 0,
            "usage.tenantContactsUsed": 0
        }
    );
    try {
        const user = await User.findById(owner.userId);
        if (user && user.deviceToken) {
            await sendPlanNotification(user._id.toString(), user.deviceToken, planId);
        }
    } catch (err) {
        console.error("Failed to send notification to owner", err);
    }
};

const sendPlanNotification = async (userId: string, deviceToken: string, planId: string) => {
    if (userId && deviceToken) {
        console.log("Sending notification to user:", userId);
        let title = "Plan Activated";
        let body = "Your subscription has been successfully updated.";

        switch (planId) {
            case "owner_free":
                title = "Free Plan Active";
                body = "Your account is now on the Free plan.";
                break;
            case "owner_starter":
                title = "Starter Plan Active! 🚀";
                body = "Your Starter plan is now active. You can now manage up to 3 active listings.";
                break;
            case "owner_pro":
                title = "Pro Plan Active! 🔥";
                body = "You're now on the Pro plan! Enjoy unlimited active listings and enhanced visibility.";
                break;
            case "owner_ultra":
                title = "Ultra Plan Active! 💎";
                body = "Welcome to Ultra! You now have maximum visibility and all premium features unlocked.";
                break;
        }

        try {
            await sendPushNotification(deviceToken, title, body);
        } catch (err) {
            console.error("Failed to send push notification to owner", err);
        }
        try {
            await (Notification as any).createNotification(userId, title, body, "success");
        } catch (err) {
            console.error("Failed to create internal notification", err);
        }
    } else {
        // no device token
        console.log("No device token found for user id:", userId);
    }
}

const sendPaymentUpdateNotification = async (payment: IPayment, title: string, body: string, type: 'info' | 'success' | 'warning' | 'error' | 'custom' = 'info') => {
    let userId: string | null = null;

    if (payment.planId.startsWith("owner_")) {
        const owner = await Owner.findById(payment.userId);
        userId = owner ? owner.userId.toString() : null;
    } else {
        userId = payment.userId.toString();
    }

    if (userId) {
        const user = await User.findById(userId);
        if (user) {
            // 1. Internal notification
            try {
                await (Notification as any).createNotification(user._id, title, body, type);
            } catch (err) {
                console.error("Failed to create internal notification", err);
            }

            // 2. Push notification
            if (user.deviceToken) {
                try {
                    await sendPushNotification(user.deviceToken, title, body);
                } catch (err) {
                    console.error("Failed to send push notification", err);
                }
            }
        }
    }
}
const handlePaymentEvent = async (event: any, data: any) => {
    const paymentId = data.metadata?.internal_payment_id;
    if (!paymentId) return;

    console.log(`[PAYMENT] Processing ${event.type} for ID: ${paymentId}`);

    // Update the base payment record for all payment events
    const updatedPayment = await PaymentEntity.findByIdAndUpdate(
        paymentId,
        {
            status: data.status,
            gatewayPaymentId: data.payment_id,
            settlementAmount: data.settlement_amount,
            totalAmount: data.total_amount,
            paymentMethod: data.payment_method
        },
        { new: true }
    );

    if (!updatedPayment) return;
    console.log("[PAYMENT] Updated payment:", updatedPayment);
    // MINIMALIST LOGIC: Notify based on finality
    if (event.type === "payment.succeeded") {
        await sendPaymentUpdateNotification(updatedPayment, "Payment Successful ✅", "Your payment has been successfully processed.", "success");
    } else if (event.type === "payment.failed") {
        await sendPaymentUpdateNotification(updatedPayment, "Payment Failed ❌", "Your payment attempt failed. Please check your details.", "error");
    }
};

const handleRefundEvent = async (event: any, data: any) => {
    const internalPaymentId = data.metadata?.internal_payment_id;
    const gatewayPaymentId = data.payment_id;

    // 1. Locate the payment
    const payment = internalPaymentId 
        ? await PaymentEntity.findById(internalPaymentId)
        : await PaymentEntity.findOne({ gatewayPaymentId });

    if (!payment) {
        console.error(`[REFUND] No matching payment found for ${gatewayPaymentId}`);
        return;
    }

    // 2. Process Succeeded Refund
    if (event.type === 'refund.succeeded') {
        console.log(`[REFUND] Succeeded for ${payment._id}. Reverting to free plan.`);
        
        await PaymentEntity.findByIdAndUpdate(payment._id, { status: 'refunded' });

        const isOwner = payment.planId.startsWith("owner_");
        const fallbackPlan = isOwner ? "owner_free" : "tenant_free";

        if (isOwner) {
            await activateOwnerBusinessLogic(null, payment.userId.toString(), fallbackPlan);
        } else {
            await activateTenantBusinessLogic(null, payment.userId.toString(), fallbackPlan);
        }

        // Notify user
        const user = await User.findById(payment.userId);
        if (user?.deviceToken) {
            await sendPushNotification(user.deviceToken, "Refund Processed", "Your payment has been refunded and your account moved to the Free plan.");
        }
    }
};

const handleSubscriptionEvent = async (event: any, data: any) => {
    const subscriptionId = data.subscription_id;
    const internalPaymentId = data.metadata?.internal_payment_id;
    const planId = data.metadata?.planId;

    if (!internalPaymentId || !planId) {
        console.error("Missing metadata in webhook:", { internalPaymentId, planId });
        return;
    }

    const payment = await PaymentEntity.findById(internalPaymentId);
    if (!payment) return;

    const isOwner = planId.startsWith("owner_");
    const userId = payment.userId.toString();

    // --- 1. SUCCESS: GRANT OR MAINTAIN ACCESS ---
    const successEvents = [
        'subscription.active',
        'subscription.renewed',
        'subscription.plan_changed',
        // update triggers frequently
        // 'subscription.updated'
    ];

    if (successEvents.includes(event.type) && data.status === 'active') {
        console.log(`[SUCCESS] Granting/Renewing ${planId} for ${userId}`);

        if (isOwner) {
            await Owner.findByIdAndUpdate(userId, { subscriptionId, autoRenew: true });
            await activateOwnerBusinessLogic(null, userId, planId);
        } else {
            await User.findByIdAndUpdate(userId, { subscriptionId, autoRenew: true });
            await activateTenantBusinessLogic(null, userId, planId);
        }
        return; // Exit early
    }

    // --- 2. FAILURE/EXPIRY: REVOKE ACCESS ---
    const failureEvents = [
        'subscription.expired',
        'subscription.failed',
        'subscription.on_hold'
    ];

    if (failureEvents.includes(event.type)) {
        console.log(`[REVOKE] Reverting to free plan for ${userId} due to ${event.type}`);

        const fallbackPlan = isOwner ? "owner_free" : "tenant_free";

        if (isOwner) {
            await activateOwnerBusinessLogic(null, userId, fallbackPlan);
        } else {
            await activateTenantBusinessLogic(null, userId, fallbackPlan);
        }
        return; // Exit early
    }

    // --- 3. SOFT CANCELLATION: UPDATE AUTO-RENEW ONLY ---
    // User keeps premium features, but will not be charged again.
    if (event.type === 'subscription.cancelled') {
        console.log(`[CANCEL] Disabling auto-renew for ${userId}`);
        
        if (isOwner) {
            await Owner.findByIdAndUpdate(userId, { autoRenew: false });
        } else {
            await User.findByIdAndUpdate(userId, { autoRenew: false });
        }
    }
};

const handleDisputeEvent = async (event: any, data: any) => {
    const gatewayPaymentId = data.payment_id;
    const payment = await PaymentEntity.findOne({ gatewayPaymentId });

    if (!payment) {
        console.error(`Dispute event received but no matching payment found. Gateway Payment ID: ${gatewayPaymentId}`);
        return;
    }

    console.log(`Received dispute event: ${event.type} for payment: ${payment._id}`);

    // Update payment status to reflect dispute state
    await PaymentEntity.findByIdAndUpdate(payment._id, { status: event.type.replace('.', '_') });

    if (event.type === 'dispute.opened' || event.type === 'dispute.lost' || event.type === 'dispute.accepted') {
        console.log(`Dispute opened/lost/accepted. Reverting business logic for user: ${payment.userId}`);

        if (payment.planId.startsWith("owner_")) {
            await activateOwnerBusinessLogic(null, payment.userId.toString(), "owner_free");
        } else if (payment.planId.startsWith("tenant_")) {
            await activateTenantBusinessLogic(null, payment.userId.toString(), "tenant_free");
        }

        const user = await User.findById(payment.userId);
        if (user?.deviceToken) {
            try {
                await sendPushNotification(
                    user.deviceToken,
                    "Subscription Update",
                    "There is an issue with your payment. Your account has been moved to the Free plan while we investigate."
                );
            } catch (err) {
                console.error("Failed to send push notification", err);
            }
        }
    } else if (event.type === 'dispute.won' || event.type === 'dispute.cancelled') {
        console.log(`Dispute won/cancelled. Manual review recommended.`);
    }
};

export const dodoWebhookHandler = async (req: Request, res: Response) => {
    try {
        const event = dodosession.webhooks.unwrap(req.body.toString(), {
            headers: {
                'webhook-id': req.headers['webhook-id'] as string,
                'webhook-signature': req.headers['webhook-signature'] as string,
                'webhook-timestamp': req.headers['webhook-timestamp'] as string,
            },
        });

        console.log(`Received Dodo webhook event type: ${event.type}`);

        const data = event.data as any;

        if (event.type.startsWith('payment.')) {
            await handlePaymentEvent(event, data);
        } else if (event.type.startsWith('subscription.')) {
            await handleSubscriptionEvent(event, data);
        } else if (event.type.startsWith('refund.')) {
            await handleRefundEvent(event, data);
        } else if (event.type.startsWith('dispute.')) {
            await handleDisputeEvent(event, data);
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Dodo webhook error", err);
        return res.status(500).send("Webhook error");
    }
};

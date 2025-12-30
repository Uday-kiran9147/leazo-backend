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
    expiresAt.setDate(expiresAt.getDate() + 7);

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

        await sendPushNotification(user.deviceToken, title, body);
        try {
            await (Notification as any).createNotification(user._id, title, body, "success");
        } catch (err) {
            console.error("Failed to create internal notification", err);
        }
    }
};

const activateBusinessLogic = async (payment: IPayment | null, ownerId?: string, planIdStr?: string) => {
    console.log("Activating business logic");
    if (payment) {
        console.log("Activating business logic for payment:", payment._id);
    }

    let owner;
    if (payment) {
        owner = await Owner.findOne({ _id: payment.userId });
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
    const ownerPortions = await Portion.find({ ownerId: owner._id }).sort({ updatedAt: -1 });
    const portions = ownerPortions;

    const bulkOps = [];
    let activeCount = 0;
    const buildingIds = new Set<string>();

    for (const portion of portions) {
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
    await sendNotification(owner.userId.toString(), planId);

};

const sendNotification = async (userId: string, planId: string) => {
    const user = await User.findById(userId);
    if (user && user.deviceToken) {
        console.log("Sending notification to user:", user._id);
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

        await sendPushNotification(user.deviceToken, title, body);
        try {
            await (Notification as any).createNotification(user._id, title, body, "success");
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

        if (event.type.startsWith('payment.')) {
            const data = event.data as any; // Narrowing types for Dodo events
            const paymentId = data.metadata?.internal_payment_id;

            console.log(`Received Dodo webhook for payment ID: ${paymentId} with event type: ${event.type}`);

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

            console.log("Updated payment with gateway session ID:", updatedPayment);

            if (updatedPayment) {
                switch (event.type) {
                    case "payment.succeeded":
                        if (updatedPayment.planId.startsWith("owner_")) {
                            await activateBusinessLogic(updatedPayment);
                        } else if (updatedPayment.planId.startsWith("tenant_")) {
                            await activateTenantBusinessLogic(updatedPayment);
                        }
                        break;

                    case "payment.processing":
                        await sendPaymentUpdateNotification(updatedPayment, "Payment Processing ⏳", "Your payment is currently being processed. We'll notify you once it's complete.", "info");
                        break;

                    case "payment.failed":
                        await sendPaymentUpdateNotification(updatedPayment, "Payment Failed ❌", "Your payment attempt failed. Please check your payment details and try again.", "error");
                        break;

                    case "payment.cancelled":
                        await sendPaymentUpdateNotification(updatedPayment, "Payment Cancelled 🛑", "Your payment was cancelled before completion.", "warning");
                        break;
                }
            }
        }
        else if (event.type.startsWith('subscription.')) {
            const data = event.data as any; // Narrowing types for Dodo events
            const subscriptionId = data.subscription_id;
            const internalPaymentId = data.metadata?.internal_payment_id;
            const planId = data.metadata?.planId;

            let owner;
            if (internalPaymentId) {
                const payment = await PaymentEntity.findById(internalPaymentId);
                if (payment) {
                    owner = await Owner.findById(payment.userId);
                    await PaymentEntity.findByIdAndUpdate(internalPaymentId, { gatewaySubscriptionId: subscriptionId });
                }
            }

            if (!owner && data.customer?.customer_id) {
                // Fallback attempt to find owner by customer_id if not found via payment
            }

            switch (event.type) {
                case 'subscription.active':
                    if (planId?.startsWith("owner_") && owner) {
                        await Owner.findByIdAndUpdate(owner._id, { subscriptionId: subscriptionId });
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Subscription active for tenant: ${payment.userId}, subscription: ${subscriptionId}`);
                            await User.findByIdAndUpdate(payment.userId, { subscriptionId: subscriptionId });
                            await activateTenantBusinessLogic(null, payment.userId.toString(), planId);
                        }
                    }
                    break;
                case 'subscription.updated':
                    if (planId?.startsWith("owner_") && owner) {
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Subscription updated for tenant: ${payment.userId}, plan: ${planId}`);
                            await activateTenantBusinessLogic(null, payment.userId.toString(), planId);
                        }
                    }
                    break;
                case 'subscription.on_hold':
                    if (planId?.startsWith("owner_") && owner) {
                        await Owner.findByIdAndUpdate(owner._id, { autoRenew: false });
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Subscription on hold for tenant: ${payment.userId}`);
                            await User.findByIdAndUpdate(payment.userId, { autoRenew: false });
                        }
                    }
                    break;
                case 'subscription.failed':
                    if (planId?.startsWith("owner_")) {
                        console.error(`Subscription failed for owner: ${owner?._id}, subscription: ${subscriptionId}`);
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        console.error(`Subscription failed for tenant: ${payment?.userId}, subscription: ${subscriptionId}`);
                    }
                    break;
                case 'subscription.renewed':
                    if (planId?.startsWith("owner_") && owner) {
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Subscription renewed for tenant: ${payment.userId}, plan: ${planId}`);
                            await activateTenantBusinessLogic(null, payment.userId.toString(), planId);
                        }
                    }
                    break;
                case 'subscription.plan_changed':
                    if (planId?.startsWith("owner_") && owner) {
                        console.log(`Plan changed for owner: ${owner._id} to ${planId}`);
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Plan changed for tenant: ${payment.userId} to ${planId}`);
                            await activateTenantBusinessLogic(null, payment.userId.toString(), planId);
                        }
                    }
                    break;
                case 'subscription.expired':
                    if (planId?.startsWith("owner_") && owner) {
                        console.log(`Subscription expired for owner: ${owner._id}`);
                        // Force downgrade to free plan immediately
                        await activateBusinessLogic(null, owner._id.toString(), "owner_free");

                        const user = await User.findById(owner.userId);
                        if (user?.deviceToken) {
                            await sendPushNotification(
                                user.deviceToken,
                                "Subscription Expired",
                                "Your premium subscription has expired. Your account has been moved to the Free plan and extra listings have been deactivated."
                            );
                        }
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Subscription expired for tenant: ${payment.userId}`);
                            await activateTenantBusinessLogic(null, payment.userId.toString(), "tenant_free");

                            const user = await User.findById(payment.userId);
                            if (user?.deviceToken) {
                                await sendPushNotification(
                                    user.deviceToken,
                                    "Subscription Expired",
                                    "Your premium tenant subscription has expired. Your account has been moved to the Free plan."
                                );
                            }
                        }
                    }
                    break;
                case 'subscription.cancelled':
                    if (planId?.startsWith("owner_") && owner) {
                        console.log(`Subscription cancelled for owner: ${owner._id}`);
                        await Owner.findByIdAndUpdate(owner._id, {
                            autoRenew: false,
                        });
                        const user = await User.findById(owner.userId);
                        if (user?.deviceToken) {
                            await sendPushNotification(
                                user.deviceToken,
                                "Subscription Cancelled",
                                "Your premium subscription has been cancelled and will not renew. You will retain access until the end of your current billing period."
                            );
                        }
                    } else if (planId?.startsWith("tenant_") && internalPaymentId) {
                        const payment = await PaymentEntity.findById(internalPaymentId);
                        if (payment) {
                            console.log(`Subscription cancelled for tenant: ${payment.userId}`);
                            await User.findByIdAndUpdate(payment.userId, {
                                autoRenew: false,
                            });
                            const user = await User.findById(payment.userId);
                            if (user?.deviceToken) {
                                await sendPushNotification(
                                    user.deviceToken,
                                    "Subscription Cancelled",
                                    "Your premium tenant subscription has been cancelled and will not renew."
                                );
                            }
                        }
                    }
                    break;
            }
        }
        else if (event.type.startsWith('refund.')) {
            const data = event.data as any;
            const internalPaymentId = data.metadata?.internal_payment_id;
            const gatewayPaymentId = data.payment_id;

            let payment;
            if (internalPaymentId) {
                payment = await PaymentEntity.findById(internalPaymentId);
            } else if (gatewayPaymentId) {
                payment = await PaymentEntity.findOne({ gatewayPaymentId });
            }

            if (payment) {
                const status = event.type === 'refund.succeeded' ? 'refunded' : 'refund_failed';
                await PaymentEntity.findByIdAndUpdate(payment._id, { status });

                if (event.type === 'refund.succeeded') {
                    console.log(`Refund succeeded for payment: ${payment._id}. Reverting business logic.`);
                    // Force downgrade to free plan as the payment was refunded
                    if (payment.planId.startsWith("owner_")) {
                        await activateBusinessLogic(null, payment.userId.toString(), "owner_free");
                    } else if (payment.planId.startsWith("tenant_")) {
                        await activateTenantBusinessLogic(null, payment.userId.toString(), "tenant_free");
                    }

                    const user = await User.findById(payment.userId);
                    if (user?.deviceToken) {
                        await sendPushNotification(
                            user.deviceToken,
                            "Refund Processed",
                            "Your payment has been successfully refunded. Your account has been moved to the Free plan."
                        );
                    }
                } else if (event.type === 'refund.failed') {
                    console.error(`Refund failed for payment: ${payment._id}. Reason: ${data.reason || data.failure_reason}`);
                }
            } else {
                console.error(`Refund event received but no matching payment found. Gateway Payment ID: ${gatewayPaymentId}`);
            }
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Dodo webhook error", err);
        return res.status(500).send("Webhook error");
    }
};

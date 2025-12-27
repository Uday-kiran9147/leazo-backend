import { IPayment, PaymentEntity } from "./payments.models";
import { Request, Response } from "express";
import { Owner } from "../models/owner.model";
import { dodosession } from "./dodo_payments_strategy";
import { Portion } from "../models/portion.model";
import { getPlanRules } from "../config/ownerConfig";
import { RedisClientManager } from "../cache/RedisClientManager";
import { sendPushNotification } from "../utils/push_notifications";
import { User } from "../models/user.model";


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
    } else {
        // no device token
        console.log("No device token found for user id:", userId);
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
                    amount: data.settlement_amount,
                    paymentMethod: data.payment_method
                },
                { new: true }
            );

            console.log("Updated payment with gateway session ID:", updatedPayment);
            if (event.type === "payment.succeeded" && updatedPayment) {
                await activateBusinessLogic(updatedPayment);
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
                    if (owner) {
                        await Owner.findByIdAndUpdate(owner._id, { subscriptionId: subscriptionId });
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    }
                    break;
                case 'subscription.updated':
                    if (owner) {
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    }
                    break;
                case 'subscription.on_hold':
                    if (owner) {
                        await Owner.findByIdAndUpdate(owner._id, { autoRenew: false });
                    }
                    break;
                case 'subscription.failed':
                    console.error(`Subscription failed for owner: ${owner?._id}, subscription: ${subscriptionId}`);
                    break;
                case 'subscription.renewed':
                    if (owner) {
                        await activateBusinessLogic(null, owner._id.toString(), planId);
                    }
                    break;
            }
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Dodo webhook error", err);
        return res.status(500).send("Webhook error");
    }
};

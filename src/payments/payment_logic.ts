import { IPayment, PaymentEntity } from "./payments.models";
import { Owner } from "../models/owner.model";
import { Portion } from "../models/portion.model";
import { getPlanRules } from "../config/ownerConfig";
import { RedisClientManager } from "../cache/RedisClientManager";
import { sendPushNotification } from "../utils/push_notifications";
import { User } from "../models/user.model";
import { logger } from "../utils/logger";
import { getTenantPlanRules } from "../config/tenantConfig";
import { Notification } from "../models/notification.model";

export const activateTenantBusinessLogic = async (payment: IPayment | null, userId?: string, planIdStr?: string) => {
    logger.info("Activating tenant business logic");

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

    logger.debug("Updating tenant plan details", { user: user._id, plan: planId });
    await User.updateOne(
        { _id: user._id },
        {
            planId: planId,
            planActivatedAt: now,
            planExpiresAt: expiresAt,
            autoRenew: true,
            "usage.ownerContactsUsed": 0
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
        logger.debug("Sending tenant notification", { user: user._id });
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
                logger.error("Failed to send push notification to tenant", err);
            }
        }
        try {
            await (Notification as any).createNotification(user._id, title, body, "success");
        } catch (err) {
            logger.error("Failed to create internal notification", err);
        }
    }
};

export const activateOwnerBusinessLogic = async (payment: IPayment | null, ownerId?: string, planIdStr?: string) => {
    logger.info("Activating Owner business logic");
    
    let owner;
    if (payment) {
        owner = await Owner.findOne({ userId: payment.userId });
    } else if (ownerId) {
        // userId is actually passed here in some cases, let's check
        // Looking at razorpay_webhooks.ts: await activateOwnerBusinessLogic(payment); -> passes payment
        // await activateOwnerBusinessLogic(null, userId, fallbackPlan); -> passes userId
        // The original code used Owner.findById(ownerId). If ownerId is a userId, it might fail if they are different.
        // Let's check Owner model or see how it's used.
        // Usually ownerId is the _id of Owner.
        owner = await Owner.findById(ownerId);
        if(!owner) {
             owner = await Owner.findOne({ userId: ownerId });
        }
    }

    if (!owner) {
        throw new Error("Owner not found for activation");
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
        
        bulkOps.push({
            updateOne: {
                filter: { _id: portion._id },
                update: { isActive: shouldBeActive }
            }
        });
        buildingIds.add(portion.buildingId.toString());
    }

    if (bulkOps.length > 0) {
        await Portion.bulkWrite(bulkOps);
        logger.debug("Portions status updated in bulk", { count: bulkOps.length });
    }

    const redis = RedisClientManager.getInstance();
    if (redis) {
        const pipeline = redis.pipeline();
        for (const portion of portions) {
            pipeline.del(`portion:${portion._id}`);
        }
        await pipeline.exec();
    }

    for (const buildingId of buildingIds) {
        await RedisClientManager.deletePattern(`building-portions:${buildingId}:*`);
    }

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
    logger.success("Owner plan activated successfully", { owner: owner._id, plan: planId });

    try {
        const user = await User.findById(owner.userId);
        if (user && user.deviceToken) {
            await sendPlanNotification(user._id.toString(), user.deviceToken, planId);
        }
    } catch (err) {
        logger.error("Failed to send notification to owner", err);
    }
};

const sendPlanNotification = async (userId: string, deviceToken: string, planId: string) => {
    if (userId && deviceToken) {
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
            logger.error("Failed to send push notification to owner", err);
        }
        try {
            await (Notification as any).createNotification(userId, title, body, "success");
        } catch (err) {
            logger.error("Failed to create internal notification", err);
        }
    }
}

import cron from 'node-cron';
import { Owner } from '../models/owner.model';
import { User } from '../models/user.model';
import { Portion } from '../models/portion.model';
import { OWNER_PLAN_RULES, getPlanRules } from '../config/ownerConfig';
import { sendPushNotification } from '../utils/push_notifications';
import { Notification } from '../models/notification.model';
import { RedisClientManager } from '../cache/RedisClientManager';
import { logger } from '../utils/logger';

/**
 * Downgrade a single expired owner to the free plan.
 * - Resets plan fields, badge, visibility
 * - Deactivates excess portions beyond the free-plan limit (1)
 * - Sends a push notification to the owner's linked user
 */
async function downgradeExpiredOwner(owner: any): Promise<void> {
    const freePlan = OWNER_PLAN_RULES.owner_free;

    // 1. Deactivate excess portions — free plan allows only 1 active listing
    const ownerPortions = await Portion.find({ ownerId: owner._id, isActive: true, isDeleted: false })
        .sort({ updatedAt: -1 });

    const bulkOps = [];
    let activeCount = 0;
    const buildingIds = new Set<string>();

    for (const portion of ownerPortions) {
        const shouldBeActive = activeCount < freePlan.activeListings;
        if (shouldBeActive) {
            activeCount++;
        } else {
            // Only create an op if it needs to change
            bulkOps.push({
                updateOne: {
                    filter: { _id: portion._id },
                    update: { isActive: false }
                }
            });
        }
        buildingIds.add(portion.buildingId.toString());
    }

    if (bulkOps.length > 0) {
        await Portion.bulkWrite(bulkOps);
        logger.debug(`[PlanExpiry] Deactivated ${bulkOps.length} excess portions for owner`, { owner: owner._id });
    }

    // 2. Update owner document to free plan
    await Owner.findByIdAndUpdate(owner._id, {
        $set: {
            planId: 'owner_free',
            verifiedBadge: freePlan.verifiedBadge,
            visibility: freePlan.visibility,
            autoRenew: false,
            planExpiresAt: null,
            'usage.activeListings': activeCount,
            'usage.weeklyBoostsUsed': 0,
            'usage.tenantContactsUsed': 0
        }
    });

    // 3. Invalidate caches
    await RedisClientManager.delete(`owner:${owner._id}`);

    const redis = RedisClientManager.getInstance();
    if (redis) {
        const pipeline = redis.pipeline();
        for (const portion of ownerPortions) {
            pipeline.del(`portion:${portion._id}`);
        }
        await pipeline.exec();
    }

    for (const buildingId of buildingIds) {
        await RedisClientManager.deletePattern(`building-portions:${buildingId}:*`);
    }

    // 4. Send push notification
    try {
        const user = await User.findById(owner.userId);
        if (user?.deviceToken) {
            await sendPushNotification(
                user.deviceToken,
                'Plan Expired ⏰',
                'Your owner plan has expired and has been downgraded to the Free plan. Upgrade to regain premium features.'
            );
        }
        await (Notification as any).createNotification(
            owner.userId,
            'Plan Expired ⏰',
            'Your owner plan has expired and has been downgraded to the Free plan. Upgrade to regain premium features.',
            'warning'
        );
    } catch (err) {
        logger.error('[PlanExpiry] Failed to send owner expiry notification', err);
    }

    logger.info(`[PlanExpiry] Owner downgraded to free`, { owner: owner._id, previousPlan: owner.planId });
}

/**
 * Downgrade a single expired tenant/user to the free plan.
 * - Resets plan fields and usage counters
 * - Sends a push notification
 */
async function downgradeExpiredUser(user: any): Promise<void> {
    await User.findByIdAndUpdate(user._id, {
        $set: {
            planId: 'tenant_free',
            autoRenew: false,
            planExpiresAt: null,
            'usage.ownerContactsUsed': 0
        }
    });

    // Invalidate cache
    await RedisClientManager.delete(`user:${user._id}`);
    await RedisClientManager.delete('users:all');

    // Send push notification
    try {
        if (user.deviceToken) {
            await sendPushNotification(
                user.deviceToken,
                'Plan Expired ⏰',
                'Your tenant plan has expired and has been downgraded to the Free plan. Upgrade to keep finding your perfect home.'
            );
        }
        await (Notification as any).createNotification(
            user._id,
            'Plan Expired ⏰',
            'Your tenant plan has expired and has been downgraded to the Free plan. Upgrade to keep finding your perfect home.',
            'warning'
        );
    } catch (err) {
        logger.error('[PlanExpiry] Failed to send tenant expiry notification', err);
    }

    logger.info(`[PlanExpiry] Tenant downgraded to free`, { user: user._id, previousPlan: user.planId });
}

/**
 * Main cron handler — finds and downgrades all expired plans.
 * Exported for manual/test invocation.
 */
export async function processExpiredPlans(): Promise<void> {
    const now = new Date();
    logger.info('[PlanExpiry] ⏰ Starting plan expiry check', { timestamp: now.toISOString() });

    try {
        // ── Expired Owners ──
        const expiredOwners = await Owner.find({
            planExpiresAt: { $lt: now },
            planId: { $ne: 'owner_free' }
        });

        logger.info(`[PlanExpiry] Found ${expiredOwners.length} expired owner plan(s)`);

        for (const owner of expiredOwners) {
            try {
                await downgradeExpiredOwner(owner);
            } catch (err) {
                logger.error(`[PlanExpiry] Failed to downgrade owner`, { owner: owner._id, error: err });
            }
        }

        // ── Expired Tenants/Users ──
        const expiredUsers = await User.find({
            planExpiresAt: { $lt: now },
            planId: { $ne: 'tenant_free' }
        });

        logger.info(`[PlanExpiry] Found ${expiredUsers.length} expired tenant plan(s)`);

        for (const user of expiredUsers) {
            try {
                await downgradeExpiredUser(user);
            } catch (err) {
                logger.error(`[PlanExpiry] Failed to downgrade tenant`, { user: user._id, error: err });
            }
        }

        logger.success(`[PlanExpiry] ✅ Plan expiry check complete`, {
            ownersDowngraded: expiredOwners.length,
            tenantsDowngraded: expiredUsers.length
        });
    } catch (err) {
        logger.error('[PlanExpiry] Critical error during plan expiry check', err);
    }
}

/**
 * Start the daily plan expiry cron job.
 * Runs every day at midnight UTC (00:00).
 */
export function startPlanExpiryCron(): void {
    // '0 0 * * *' = every day at 00:00 UTC
    cron.schedule('0 0 * * *', async () => {
        await processExpiredPlans();
    }, {
        timezone: 'UTC'
    });

    logger.info('[PlanExpiry] 📅 Daily plan expiry cron job registered (00:00 UTC)');
}

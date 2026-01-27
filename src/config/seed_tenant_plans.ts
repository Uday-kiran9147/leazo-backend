import { Plan, UserType } from "../models/plan.model";
import { TENANT_PLAN_RULES } from "./tenantConfig";
import { logger } from "../utils/logger";

const TENANT_PLAN_META = {
  tenant_free: {
    name: "Free",
    durationDays: null,
    price: 0
  },
  tenant_smart_finder: {
    name: "Smart Finder",
    durationDays: 30,
    price: 49 // Guessing the price since it's not in the rules yet, but I'll use what's in the rules if available.
  },
  tenant_premium: {
    name: "Premium",
    durationDays: 30,
    price: 99
  }
} as const;

export const seedTenantPlans = async () => {
  try {
    const plans = Object.entries(TENANT_PLAN_RULES).map(
      ([planId, rules]) => {
        const meta = TENANT_PLAN_META[planId as keyof typeof TENANT_PLAN_META];

        return {
          id: planId,
          name: meta.name,
            userType: UserType.TENANT,
          price: (rules as any).price || meta.price,
          durationDays: meta.durationDays,
          features: rules,
          isActive: true
        };
      }
    );

    const bulkOps = plans.map(plan => ({
      updateOne: {
        filter: { id: plan.id },
        update: { $set: plan },
        upsert: true
      }
    }));

    await Plan.bulkWrite(bulkOps);

    logger.success(`Seeded ${plans.length} tenant plans with KV features`);
  } catch (err) {
    logger.error("Failed to seed tenant plans", err);
  }
};

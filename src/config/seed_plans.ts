import dotenv from "dotenv";
import { Plan, UserType } from "../models/plan.model";
import { OWNER_PLAN_RULES } from "./ownerConfig";

dotenv.config();

const OWNER_PLAN_META = {
  owner_free: {
    name: "Free",
    durationDays: null,
    price: 0
  },
  owner_starter: {
    name: "Starter",
    durationDays: 30,
    price: 99
  },
  owner_pro: {
    name: "Pro",
    durationDays: 30,
    price: 199
  },
  owner_ultra: {
    name: "Ultra",
    durationDays: 30,
    price: 299
  }
} as const;

export const seedOwnerPlans = async () => {
  try {
    if (!process.env.DB_URL) {
      throw new Error("DB_URL not found");
    }

    // await mongoose.connect(process.env.DB_URL);

    const plans = Object.entries(OWNER_PLAN_RULES).map(
      ([planId, rules]) => {
        const meta = OWNER_PLAN_META[planId as keyof typeof OWNER_PLAN_META];

        return {
          id: planId,
          name: meta.name,
            userType: UserType.OWNER,
          price: meta.price,
          durationDays: meta.durationDays,
          features: {
            activeListings: rules.activeListings,
            photosPerListing: rules.photosPerListing,
            weeklyBoosts: rules.weeklyBoosts,
            tenantContacts: rules.tenantContacts,
            verifiedBadge: rules.verifiedBadge,
            visibility: rules.visibility,
            autoRenew: rules.autoRenew
          },
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

    console.log(`✅ Seeded ${plans.length} owner plans with KV features`);
  } catch (err) {
    console.error("❌ Failed to seed owner plans:", err);
  }
};



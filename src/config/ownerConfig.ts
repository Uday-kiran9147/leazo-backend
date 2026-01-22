
/// TODO: Update the plan products with razorpay plan ids
const OWNER_PLAN_PRODUCTS_DEVELOPMENT= {
  owner_free: null,
  owner_starter: "pdt_0NUtXhgn0YnW1ff0k2253",
  owner_pro: "pdt_0NUuNjQPfCKcYLkjVO8xz",
  owner_ultra: "pdt_0NUuPis72HWaLFhva4Jpi",
} as const;

const OWNER_PLAN_PRODUCTS_PRODUCTION= {
  owner_free: null,
  owner_starter: "pdt_0NVFJi0DYT9NtRE0eExT6",
  owner_pro: "pdt_0NVFK13N69zCf8o1u6PAm",
  owner_ultra: "pdt_0NVFKHoyNxHOhC0bm9d2j",
} as const;

export const OWNER_PLAN_RULES = {
  owner_free: {
    price:0,
    activeListings: 1,
    photosPerListing: 3,
    weeklyBoosts: 0,
    tenantContacts: 0,
    verifiedBadge: false,
    visibility: "basic",
    autoRenew: false
  },
  owner_starter: {
    price:99,
    activeListings: 3,
    photosPerListing: 8,
    weeklyBoosts: 1,
    tenantContacts: 10,
    verifiedBadge: true,
    visibility: "enhanced",
    autoRenew: true
  },
  owner_pro: {
    price:199,
    activeListings: -1,
    photosPerListing: 15,
    weeklyBoosts: 7,
    tenantContacts: -1,
    verifiedBadge: true,
    visibility: "high",
    autoRenew: true
  },
  owner_ultra: {
    price:299,
    activeListings: -1,
    photosPerListing: 22,
    weeklyBoosts: 7,
    tenantContacts: -1,
    verifiedBadge: true,
    visibility: "boosted",
    autoRenew: true
  }
} as const;

export const getPlanRules = (planId: keyof typeof OWNER_PLAN_RULES) => {
  return OWNER_PLAN_RULES[planId];
}

// Determine which set of plan products to use based on the environment
const OWNER_PLAN_PRODUCTS =  process.env.NODE_ENV === "development" ? OWNER_PLAN_PRODUCTS_DEVELOPMENT : OWNER_PLAN_PRODUCTS_PRODUCTION;

export const OwnerPlanId: Record<string, string | null> = OWNER_PLAN_PRODUCTS;

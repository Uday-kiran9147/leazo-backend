const OWNER_PLAN_PRODUCTS= {
  owner_free: null,
  owner_starter: "pdt_0NUtXhgn0YnW1ff0k2253",
  owner_pro: "pdt_0NUuNjQPfCKcYLkjVO8xz",
  owner_ultra: "pdt_0NUuPis72HWaLFhva4Jpi",
} as const;

const OWNER_PLAN_RULES = {
  owner_free: {
    activeListings: 1,
    photosPerListing: 3,
    weeklyBoosts: 0,
    tenantContacts: 0,
    verifiedBadge: false,
    visibility: "basic",
    autoRenew: false
  },
  owner_starter: {
    activeListings: 3,
    photosPerListing: 8,
    weeklyBoosts: 1,
    tenantContacts: 10,
    verifiedBadge: true,
    visibility: "enhanced",
    autoRenew: true
  },
  owner_pro: {
    activeListings: Infinity,
    photosPerListing: 15,
    weeklyBoosts: 7,
    tenantContacts: Infinity,
    verifiedBadge: true,
    visibility: "high",
    autoRenew: true
  },
  owner_ultra: {
    activeListings: Infinity,
    photosPerListing: 22,
    weeklyBoosts: 7,
    tenantContacts: Infinity,
    verifiedBadge: true,
    visibility: "boosted",
    autoRenew: true
  }
} as const;

export const getPlanRules = (planId: keyof typeof OWNER_PLAN_RULES) => {
  return OWNER_PLAN_RULES[planId];
}
export const OwnerPlanId: Record<string, string | null> = {
  owner_free: null,
  owner_starter: "pdt_0NUtXhgn0YnW1ff0k2253",
  owner_pro: "pdt_0NUuNjQPfCKcYLkjVO8xz",
  owner_ultra: "pdt_0NUuPis72HWaLFhva4Jpi",
};
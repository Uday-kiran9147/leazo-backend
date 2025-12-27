export const TENANT_PLAN_RULES = {
  tenant_free: {
    ownerContacts: 3,
    filters: "basic",
    earlyAccess: false,
    verifiedOnly: false,
    instantChat: false,
    adFree: false
  },
  tenant_smart_finder: {
    ownerContacts: Infinity,
    filters: "advanced",
    earlyAccess: true,
    verifiedOnly: false,
    instantChat: false,
    adFree: false
  },
  tenant_premium: {
    ownerContacts: Infinity,
    filters: "advanced",
    earlyAccess: true,
    verifiedOnly: true,
    instantChat: true,
    adFree: true
  }
} as const;

export const getTenantPlanRules = (planId: keyof typeof TENANT_PLAN_RULES) => {
  return TENANT_PLAN_RULES[planId];
}

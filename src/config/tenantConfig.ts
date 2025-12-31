export const TENANT_PLAN_RULES = {
  tenant_free: {
    price:0,
    ownerContacts: 0,
    filters: "basic",
    earlyAccess: false,
    verifiedOnly: false,
    instantChat: false,
    adFree: false,
  },
  tenant_smart_finder: {
    price:99,
    ownerContacts: 3,
    filters: "advanced",
    earlyAccess: true,
    verifiedOnly: false,
    instantChat: false,
    adFree: false
  },
  tenant_premium: {
    price:199,
    ownerContacts: -1,
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


const TENANT_PLAN_PRODUCTS_DEVELOPMENT = {
  tenant_free: null,
  tenant_smart_finder: "pdt_0NV0cD7tvCxlSvdqLSsX8",
  tenant_premium: "pdt_0NV0cQXlAWmbA49fBNUNO",
} as const;

const TENANT_PLAN_PRODUCTS_PRODUCTION= {
  tenant_free: null,
  tenant_smart_finder: "pdt_0NVFKJUWNRLs2Bq9cmOJH",
  tenant_premium: "pdt_0NVFKKhBs5Kuj9J8YxqYv",
} as const;

const TENANT_PLAN_PRODUCTS = process.env.NODE_ENV === "development" ? TENANT_PLAN_PRODUCTS_DEVELOPMENT : TENANT_PLAN_PRODUCTS_PRODUCTION;
export const TenantPlanId: Record<string, string | null> =  TENANT_PLAN_PRODUCTS;
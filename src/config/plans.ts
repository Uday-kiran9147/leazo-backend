export enum OwnerPlan {
  FREE = "Free",
  STARTER = "Starter",
  PRO = "Pro",
  ULTRA = "Ultra",
}

export enum TenantPlan {
  FREE = "Free",
  SMART_FINDER = "Smart Finder",
  PREMIUM = "Premium",
}

export const OWNER_PLAN_LIMITS = [
  {
    id: "owner_free",
    name: "Free",
    userType: "Owner",
    price: 0,
    durationDays: null,
    features: [
      "Active listings: 1",
      "Photos per listing: 3",
      "Weekly boosts: 0",
      "Verified badge: No",
      "Tenant contacts: 0",
      "Visibility: Basic",
    ],
    isActive: true,
  },
  {
    id: "owner_starter",
    name: "Starter",
    userType: "Owner",
    price: 99,
    durationDays: 30,
    features: [
      "Active listings: 3",
      "Photos per listing: 8",
      "Weekly boosts: 1",
      "Verified badge: Yes",
      "Tenant contacts: 10",
      "Visibility: Enhanced",
    ],
    isActive: true,
  },
  {
    id: "owner_pro",
    name: "Pro",
    userType: "Owner",
    price: 199,
    durationDays: 30,
    features: [
      "Active listings: Unlimited",
      "Photos per listing: 15",
      "Weekly boosts: 7",
      "Verified badge: Yes",
      "Tenant contacts: Unlimited",
      "Visibility: High",
      "Auto renew",
    ],
    isActive: true,
  },
  {
    id: "owner_ultra",
    name: "Ultra",
    userType: "Owner",
    price: 299,
    durationDays: 30,
    features: [
      "Active listings: Unlimited",
      "Weekly boosts: 7",
      "Verified badge: Yes",
      "Tenant contacts: Unlimited",
      "Visibility: Top City Placement",
      "AI rent suggestion",
      "Performance insights",
      "Priority support",
    ],
    isActive: true,
  },
];

export const TENANT_PLAN_LIMITS = [
  {
    id: "tenant_free",
    name: "Free",
    userType: "Tenant",
    price: 0,
    durationDays: null,
    features: [
      "Unlimited browsing",
      "Owner contacts: 3",
      "Filters: Basic",
    ],
    isActive: true,
  },
  {
    id: "tenant_smart_finder",
    name: "Smart Finder",
    userType: "Tenant",
    price: 49,
    durationDays: 7,
    features: [
      "Unlimited owner contacts",
      "Early access to listings",
      "Filters: Advanced",
    ],
    isActive: true,
  },
  {
    id: "tenant_premium",
    name: "Premium",
    userType: "Tenant",
    price: 99,
    durationDays: 7,
    features: [
      "Verified rooms only",
      "Curated shortlists",
      "Ad-free experience",
      "Instant owner chat",
    ],
    isActive: true,
  },
];



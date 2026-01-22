export const RAZORPAY_CONFIG = {
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    plans: {
        owner_starter: process.env.RAZORPAY_PLAN_OWNER_STARTER || '',
        owner_pro: process.env.RAZORPAY_PLAN_OWNER_PRO || '',
        owner_ultra: process.env.RAZORPAY_PLAN_OWNER_ULTRA || '',
        tenant_smart_finder: process.env.RAZORPAY_PLAN_TENANT_SMART_FINDER || '',
        tenant_premium: process.env.RAZORPAY_PLAN_TENANT_PREMIUM || '',
    }
};

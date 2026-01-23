// ============================================================================
// FILE: src/services/razorpay/razorpay.types.ts
// Purpose: Type definitions for Razorpay integration
// ============================================================================

export interface RazorpayPlanConfig {
    planId: string;           // Internal plan ID (e.g., "owner_pro")
    razorpayPlanId: string;   // Razorpay Plan ID (e.g., "plan_xxxxx")
    name: string;
    amount: number;           // In paise
    currency: string;
    interval: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface CreateSubscriptionInput {
    userId: string;
    planId: string;
    email: string;
    name: string;
    phone?: string;
    totalCount?: number;      // Number of billing cycles
    notes?: Record<string, string>;
}

export interface SubscriptionResult {
    subscriptionId: string;
    shortUrl: string;
    status: string;
    paymentRecordId: string;
}

export interface VerifySubscriptionInput {
    razorpayPaymentId: string;
    razorpaySubscriptionId: string;
    razorpaySignature: string;
}

// ========== Webhook Payload ==========

export interface WebhookPayload {
    event: string;
    payload: {
        subscription?: { entity: RazorpaySubscriptionEntity };
        payment?: { entity: RazorpayPaymentEntity };
        dispute?: { entity: RazorpayDisputeEntity };
        downtime?: { entity: RazorpayDowntimeEntity };
    };
}

// ========== Razorpay Entities ==========

export interface RazorpaySubscriptionEntity {
    id: string;
    plan_id: string;
    status: string;
    current_start: number;
    current_end: number;
    ended_at: number | null;
    quantity: number;
    notes: Record<string, string>;
    charge_at: number;
    offer_id: string | null;
    short_url: string;
    has_scheduled_changes: boolean;
    change_scheduled_at: number | null;
    payment_method: string;
    customer_id: string;
}

export interface RazorpayPaymentEntity {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    description: string;
    order_id: string | null;
    email: string;
    contact: string;
    fee?: number;
    tax?: number;
    error_code?: string;
    error_description?: string;
    error_source?: string;
    error_step?: string;
    error_reason?: string;
}

export interface RazorpayDisputeEntity {
    id: string;
    payment_id: string;
    amount: number;
    currency: string;
    amount_deducted: number;
    reason_code: string;
    reason_description: string;
    respond_by: number;
    status: string;
    phase: string;
    created_at: number;
}

export interface RazorpayDowntimeEntity {
    id: string;
    method: string;
    begin: number;
    end: number | null;
    status: string;
    severity: 'high' | 'medium' | 'low';
    scheduled: boolean;
    instrument?: {
        bank?: string;
        psp?: string;
    };
}

// ========== Status Types ==========

export type SubscriptionStatus = 
    | 'created' 
    | 'authenticated' 
    | 'active' 
    | 'pending' 
    | 'halted' 
    | 'cancelled' 
    | 'completed' 
    | 'expired'
    | 'paused';

export type DisputeStatus = 
    | 'open'
    | 'under_review'
    | 'won'
    | 'lost'
    | 'closed'
    | 'action_required';

export type PaymentStatus = 
    | 'created'
    | 'authorized'
    | 'captured'
    | 'refunded'
    | 'failed';
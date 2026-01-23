// ============================================================================
// FILE: src/services/razorpay/razorpay.types.ts
// Purpose: Type definitions for Razorpay integration
// ============================================================================

// ========== Input/Output Types ==========

export interface CreateOrderInput {
    userId: string;
    planId: string;
    email: string;
    name: string;
    phone?: string;
    notes?: Record<string, string>;
}

export interface OrderResult {
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    paymentRecordId: string;
    key: string;
}

export interface VerifyPaymentInput {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

// ========== Webhook Payload ==========

export interface WebhookPayload {
    event: string;
    payload: {
        order?: { entity: RazorpayOrderEntity };
        payment?: { entity: RazorpayPaymentEntity };
        refund?: { entity: RazorpayRefundEntity };
        dispute?: { entity: RazorpayDisputeEntity };
        downtime?: { entity: RazorpayDowntimeEntity };
    };
}

// ========== Razorpay Entities ==========

export interface RazorpayOrderEntity {
    id: string;
    entity: 'order';
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
}

export interface RazorpayPaymentEntity {
    id: string;
    entity: 'payment';
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
    notes?: Record<string, string>;
    created_at?: number;
}

export interface RazorpayRefundEntity {
    id: string;
    entity: 'refund';
    payment_id: string;
    amount: number;
    currency: string;
    receipt: string | null;
    status: 'pending' | 'processed' | 'failed';
    speed_requested: 'normal' | 'optimum';
    speed_processed: 'normal' | 'instant';
    notes: Record<string, string>;
    created_at: number;
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

export type OrderStatus = 'created' | 'attempted' | 'paid';

export type PaymentStatus = 
    | 'created'
    | 'authorized'
    | 'captured'
    | 'refunded'
    | 'failed';

export type DisputeStatus = 
    | 'open'
    | 'under_review'
    | 'won'
    | 'lost'
    | 'closed'
    | 'action_required';
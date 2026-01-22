// ============================================================================
// FILE: src/services/razorpay/razorpay.client.ts
// Purpose: Razorpay SDK client singleton
// ============================================================================

import Razorpay from 'razorpay';
import { RAZORPAY_CONFIG } from '../../config/razorpayConfig';

class RazorpayClient {
    private static instance: Razorpay;

    static getInstance(): Razorpay {
        if (!RazorpayClient.instance) {
            if (!RAZORPAY_CONFIG.key_id || !RAZORPAY_CONFIG.key_secret) {
                throw new Error('Razorpay credentials not configured');
            }
            RazorpayClient.instance = new Razorpay({
                key_id: RAZORPAY_CONFIG.key_id,
                key_secret: RAZORPAY_CONFIG.key_secret,
            });
        }
        return RazorpayClient.instance;
    }
}

export const razorpayClient = RazorpayClient.getInstance();
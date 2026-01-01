import DodoPayments from "dodopayments";
import { IPaymentStrategy } from "./payment_interface";
import { OwnerPlanId } from "../config/ownerConfig";
import { TenantPlanId } from "../config/tenantConfig";

export const dodosession = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
    webhookKey: process.env.DODO_WEBHOOK_SECRET,
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode'
})

export class DodoPaymentsStrategy implements IPaymentStrategy {

    
    async getCheckoutSession(paymentId: string, planId: string, customerId: string, email: string, name: string): Promise<string> {

        let productId: string | null | undefined;
        if (planId.startsWith("owner_")) {
            productId = OwnerPlanId[planId];
        } else if (planId.startsWith("tenant_")) {
            productId = TenantPlanId[planId];
        }

        if (!productId) {
            throw new Error(`Invalid planId: ${planId}`);
        }
        const front = process.env.DODO_RETURN_URL ?? 'https://leazo.vercel.app/dodo-return';
        const session = await dodosession.checkoutSessions.create({
            product_cart: [
                {
                    product_id: productId , quantity: 1
                }
            ],
            feature_flags: { redirect_immediately: true },
            customer: {
                name: name,
                email: email,
            },
            metadata: {
                internal_payment_id: paymentId,
                productId,
                planId                
            },
            return_url: `${front}?internal_payment_id=${paymentId}`,
        });

        if (!session.checkout_url) {
            throw new Error('Failed to create checkout session: checkout_url is missing');
        }

        return session.checkout_url;

    }

}

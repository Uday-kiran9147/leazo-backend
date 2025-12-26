import DodoPayments from "dodopayments";
import { IPaymentStrategy } from "./payment_interface";

export const dodosession = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
    webhookKey: process.env.DODO_WEBHOOK_SECRET,
    environment: 'test_mode' // or 'live_mode'
})

export class DodoPaymentsStrategy implements IPaymentStrategy {
    async getCheckoutSession(paymentId: string, productId: string, customerId: string, email: string, name: string): Promise<string> {

        const session = await dodosession.checkoutSessions.create({
            product_cart: [
                {
                    product_id: productId, quantity: 1
                }
            ],
            customer: {
                name: name,
                email: email,
            },
            metadata: {
                internal_payment_id: paymentId,
            },
            return_url: 'https://leazo.vercel.app',
        });

        if (!session.checkout_url) {
            throw new Error('Failed to create checkout session: checkout_url is missing');
        }

        return session.checkout_url;

    }

}

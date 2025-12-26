import DodoPayments from "dodopayments";
import { IPaymentStrategy } from "./payment_interface.js";
import { Payment } from "./payments.models.js";

const dodosession = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
    environment: 'test_mode'
})

export class DodoPaymentsStrategy implements IPaymentStrategy {
    async getCheckoutSession(productId: string, customerId: string, email: string, name: string): Promise<string> {

        const payment = await Payment.create({
            customerId,
            gateway: "dodo",
            status: "created",
            purpose: "subscription",
            metadata: { productId }
        });
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
                internal_payment_id: payment._id?.toString(),
            },
            return_url: 'https://leazo.vercel.app',
        });

        if (!session.checkout_url) {
            throw new Error('Failed to create checkout session: checkout_url is missing');
        }

        await Payment.updateOne(
            { _id: payment._id },
            { gatewaySessionId: session.session_id }
        );
        return session.checkout_url;

    }

}

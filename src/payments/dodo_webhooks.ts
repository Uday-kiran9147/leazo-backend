import { IPayment, PaymentEntity } from "./payments.models";
import { Request, Response } from "express";
import { Owner } from "../models/owner.model";
import { dodosession } from "./dodo_payments_strategy";


const activateBusinessLogic = async (payment: IPayment) => {
    console.log("Activating business logic for payment");
    console.log("Activating business logic for payment:", payment._id);

    const owner = await Owner.findOne({ _id: payment.userId });

    if (!owner) {
        throw new Error("Owner not found for user");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await Owner.updateOne(
        { _id: owner._id },
        {
            planId: "owner_starter",
            planActivatedAt: now,
            planExpiresAt: expiresAt,
            verifiedBadge: true,
            visibility: "enhanced",
            autoRenew: false,
            "usage.activeListings": 0,
            "usage.weeklyBoostsUsed": 0,
            "usage.tenantContactsUsed": 0
        }
    );
};


async function rollbackBusinessLogic(payment: any) {
    // Implement business logic for failed payment
    console.log("Rolling back business logic for payment:", payment._id);
}


export const dodoWebhookHandler = async (req: Request, res: Response) => {
    try {

        const event = dodosession.webhooks.unwrap(req.body.toString(), {
            headers: {
                'webhook-id': req.headers['webhook-id'] as string,
                'webhook-signature': req.headers['webhook-signature'] as string,
                'webhook-timestamp': req.headers['webhook-timestamp'] as string,
            },
        });;

        /* 
        payment.cancelled
        payment.failed
        payment.processing
        payment.succeeded
        */
        if (event.type === 'payment.succeeded') {
            const paymentId = event.data.metadata.internal_payment_id;
            // Use your metadata here
            const data = event.data;
            const updatedPayment = await PaymentEntity.findByIdAndUpdate(
                paymentId,
                {
                    status: data.status,
                    gatewayPaymentId: data.payment_id,
                    amount: data.settlement_amount,
                    paymentMethod: data.payment_method
                },
                { new: true }
            );

            console.log("Updated payment with gateway session ID:", updatedPayment);
            if (updatedPayment) {
                await activateBusinessLogic(updatedPayment);
            }

        }

        if (event.type === 'payment.failed' || event.type === 'payment.cancelled') {
            const paymentId = event.data.metadata.internal_payment_id;
            // Use your metadata here
            const data = event.data;
            const updatedPayment = await PaymentEntity.findByIdAndUpdate(
                paymentId,
                {
                    status: data.status,
                    gatewayPaymentId: data.payment_id,
                    amount: data.settlement_amount,
                    paymentMethod: data.payment_method
                },
                { new: true }
            );
            console.log("Updated payment with gateway session ID:", updatedPayment);
        }
        if (event.type === 'payment.processing') {
            const paymentId = event.data.metadata.internal_payment_id;
            // Use your metadata here
            const data = event.data;
            const updatedPayment = await PaymentEntity.findByIdAndUpdate(
                paymentId,
                {
                    status: data.status,
                    gatewayPaymentId: data.payment_id,
                    amount: data.settlement_amount,
                    paymentMethod: data.payment_method
                },
                { new: true }
            );
            console.log("Updated payment with gateway session ID:", updatedPayment);
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Dodo webhook error", err);
        return res.status(500).send("Webhook error");
    }
};

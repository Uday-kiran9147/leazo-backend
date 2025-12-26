import crypto from "crypto";
import { Payment } from "./payments.models.js";
import { Request, Response } from "express";

const activateBusinessLogic = (payment: InstanceType<typeof Payment>) => {
    // Implement business logic for successful payment
    console.log("Activating business logic for payment:", payment._id);
    
}

async function rollbackBusinessLogic(payment: InstanceType<typeof Payment>) {
    // Implement business logic for failed payment
    console.log("Rolling back business logic for payment:", payment._id);
}


export const dodoWebhookHandler = async (req:Request, res:Response) => {
    try {
        const signature = req.headers["x-signature"] as string;
        const payload = req.body;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.DODO_WEBHOOK_SECRET!)
            .update(payload)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.warn("Invalid signature", { received: signature, expected: expectedSignature });
            return res.status(401).send("Invalid signature");
        }

        const event = JSON.parse(payload.toString());

        const data = event.data;

        const internalPaymentId = data.metadata?.internal_payment_id;
        if (!internalPaymentId) {
            return res.status(200).send("No internal payment id");
        }

        const payment = await Payment.findById(internalPaymentId);
        if (!payment) {
            return res.status(200).send("Payment not found");
        }

        if (payment.status === data.status) {
            return res.status(200).send("Duplicate event");
        }

        const updatedPayment = await Payment.findByIdAndUpdate(
            internalPaymentId,
            {
                status: data.status,
                gatewayPaymentId: data.payment_id,
                amount: data.settlement_amount,
                paymentMethod: data.payment_method
            },
            { new: true }
        );

        if (data.status === "success" && updatedPayment) {
            await activateBusinessLogic(updatedPayment);
        }

        if (data.status === "failed") {
            await rollbackBusinessLogic(payment);
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Dodo webhook error", err);
        return res.status(500).send("Webhook error");
    }
};

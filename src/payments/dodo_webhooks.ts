import crypto from "crypto";
import { PaymentEntity } from "./payments.models";
import { Request, Response } from "express";
import { Owner } from "../models/owner.model";


const activateBusinessLogic = async (payment: any) => {
    console.log("Activating business logic for payment:", payment._id);

    const owner = await Owner.findOne({ userId: payment.userId });

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
        const signature = req.headers["webhook-id"] as string;
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

        const payment = await PaymentEntity.findById(internalPaymentId);
        if (!payment) {
            return res.status(200).send("Payment not found");
        }

        if (payment.status === data.status) {
            return res.status(200).send("Duplicate event");
        }

        const updatedPayment = await PaymentEntity.findByIdAndUpdate(
            internalPaymentId,
            {
                status: data.status,
                gatewayPaymentId: data.payment_id,
                amount: data.settlement_amount,
                paymentMethod: data.payment_method
            },
            { new: true }
        );

        console.log("Updated payment with gateway session ID:", updatedPayment);
        // print    
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

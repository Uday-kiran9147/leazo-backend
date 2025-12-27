import { Request, Response } from "express";

import { IPaymentStrategy } from "../payments/payment_interface";
import { PaymentContext } from "../payments/payment_context";
import { DodoPaymentsStrategy } from "../payments/dodo_payments_strategy";
import { log } from "console";
import { PaymentEntity } from "../payments/payments.models";
import { TenantPlanId } from "../config/tenantConfig";
import { OwnerPlanId } from "../config/ownerConfig";

const dodoPaymentsStrategy: IPaymentStrategy = new DodoPaymentsStrategy();
const paymentContext = new PaymentContext(dodoPaymentsStrategy);

export const getCheckoutSession = async (req: Request, res: Response) => {
    const { planId, customerId, email, name } = req.body.paymentSessionData;
    log("Creating checkout session for:", { planId, customerId, email, name });

    let productId: string | null | undefined;
    if (planId.startsWith("owner_")) {
        productId = OwnerPlanId[planId];
    } else if (planId.startsWith("tenant_")) {
        productId = TenantPlanId[planId];
    }

    if (planId !== "owner_free" && planId !== "tenant_free" && !productId) {
        console.error("Invalid planId or productId not found for planId:", planId);
        return res.status(400).json({ error: "Invalid planId" });
    }
    const payment = await PaymentEntity.create({
        userId: customerId,
        gateway: "dodo",
        status: "initiated",
        planId: planId,
        metadata: {
            planId,
            productId
        }
    });

    console.log("Created payment record:", payment);
    const paymentId = payment._id.toString();
    paymentContext.getCheckoutSession(paymentId, planId, customerId, email, name)
        .then((checkout_url: string) => {
            res.status(200).json({ data: checkout_url });
        })
        .catch((error: Error) => {
            console.error("Error creating checkout session:", error);
            res.status(500).json({ error: "Failed to create checkout session" });
        });
}
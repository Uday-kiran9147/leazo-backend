import { IPayment, PaymentEntity } from "./payments.models";
import { Request, Response } from "express";
import { Owner } from "../models/owner.model";
import { dodosession } from "./dodo_payments_strategy";
import { Portion } from "../models/portion.model";
import { getPlanRules } from "../config/ownerConfig";
import { RedisClientManager } from "../cache/RedisClientManager";


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
    // update portions to set isActive to true only 3 from date updated and rest to false

    const planId = payment.planId as "owner_free" | "owner_starter" | "owner_pro" | "owner_ultra";
    const plan = getPlanRules(planId);
    const ownerPortions = await Portion.find({ ownerId: owner._id }).sort({ updatedAt: -1 });
    const portions = ownerPortions;

    const bulkOps = [];
    let activeCount = 0;
    const buildingIds = new Set<string>();

    // Determine which portions should be active based on the new plan

    for (const portion of portions) {
        const shouldBeActive = plan.activeListings === Infinity || activeCount < plan.activeListings;

        if (shouldBeActive) activeCount++;
        console.log(`Portion ${portion.title} should be active:`, shouldBeActive);
        bulkOps.push({
            updateOne: {
                filter: { _id: portion._id },
                update: { isActive: shouldBeActive }
            }
        });
        buildingIds.add(portion.buildingId.toString());
    }

    if (bulkOps.length > 0) {
        console.log("Updating portions in bulk:", bulkOps.length);
        await Portion.bulkWrite(bulkOps);
    }

    // Invalidate cache for affected portions and buildings
    const redis = RedisClientManager.getInstance();
    if (redis) {
        const pipeline = redis.pipeline();
        for (const portion of portions) {
            console.log("Invalidating cache for portion:", portion._id);
            pipeline.del(`portion:${portion._id}`);
        }
        await pipeline.exec();
    }

    // Invalidate building portions cache
    for (const buildingId of buildingIds) {

        /* This clears:
        building-portions:123
        building-portions:123:p1:l10
        building-portions:123:p2:l10
        any future variants 
        */
        console.log("Invalidating cache for building portions:", buildingId);
        await RedisClientManager.deletePattern(
            `building-portions:${buildingId}:*`
        );
    }

    console.log("Updating owner plan details");

    await Owner.updateOne(
        { _id: owner._id },
        {
            planId: payment.planId,
            planActivatedAt: now,
            planExpiresAt: expiresAt,
            verifiedBadge: plan.verifiedBadge,
            visibility: plan.visibility,
            autoRenew: plan.autoRenew,
            "usage.activeListings": activeCount,
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
        if (event.type === 'payment.processing' || event.type === 'payment.succeeded' || event.type === 'payment.failed' || event.type === 'payment.cancelled') {
            const paymentId = event.data.metadata.internal_payment_id;
            const current_type = event.type;

            console.log(`Received Dodo webhook for payment ID: ${paymentId} with event type: ${current_type}`);
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
            if (current_type === "payment.succeeded" && updatedPayment) {
                await activateBusinessLogic(updatedPayment);
            }

        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Dodo webhook error", err);
        return res.status(500).send("Webhook error");
    }
};

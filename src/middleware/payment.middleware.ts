import { NextFunction, Request, Response } from "express";



export const getCheckoutSessionMiddleware = (req:Request, res:Response, next:NextFunction) => {
    
    const { email, firstName } = req.body.user;
    const { planId } = req.body;
    // Map planId to productId
    if (!planId) {
        return res.status(400).json({ message: "Invalid or free plan" });
    }
    let customerId: string | undefined;
    if (planId.startsWith("owner_")) {
        customerId = req.body.user.ownerId?.toString();
    } else if (planId.startsWith("tenant_")) {
        customerId = req.body.user._id?.toString();
    }
    const missingFields = [];
    if (!planId || !customerId || !email || !firstName) {
        if (!planId) missingFields.push("planId");
        if (!customerId) missingFields.push("customerId");
        if (!email) missingFields.push("email");
        if (!firstName) missingFields.push("firstName");
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }
    req.body.paymentSessionData = { planId, customerId, email, name:firstName };
    next();
}
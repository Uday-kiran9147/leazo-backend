import { NextFunction, Request, Response } from "express";
import { OWNER_PLAN_PRODUCTS } from "../config/ownerConfig";


export const getCheckoutSessionMiddleware = (req:Request, res:Response, next:NextFunction) => {
    
    const { email, firstName } = req.body.user;
    const { planId } = req.body;
    // Map planId to productId
    const productId = OWNER_PLAN_PRODUCTS[planId as keyof typeof OWNER_PLAN_PRODUCTS];
    if (!productId) {
        return res.status(400).json({ message: "Invalid or free plan" });
    }
    const customerId  = req.body.user.ownerId.toString();
    const missingFields = [];
    if (!productId || !customerId || !email || !firstName) {
        if (!productId) missingFields.push("productId");
        if (!customerId) missingFields.push("customerId");
        if (!email) missingFields.push("email");
        if (!firstName) missingFields.push("firstName");
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }
    req.body.paymentSessionData = { productId, customerId, email, name:firstName };
    next();
}
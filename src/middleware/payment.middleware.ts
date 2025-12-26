import { NextFunction, Request, Response } from "express";


export const getCheckoutSessionMiddleware = (req:Request, res:Response, next:NextFunction) => {
    
    const { email, firstName } = req.body.user;
    const { productId} = req.body;
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
import { NextFunction, Request, Response } from "express";

// Middleware to check if the user is an admin
export const isAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Assuming the user role is stored in `req.user.role`
    if (req.body.user && req.body.user.role === "Admin" || req.body.user.role === "Moderator") {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Admins and Moderators only." });
    }
};

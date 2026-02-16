import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/api_error";
import { User } from "../models/user.model";
import { logger } from "../utils/logger";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.headers.authorization;

        if (!token) {
            // code checked
            return res.status(400).send({ error: "Please provide token" });
        }

        if (token.startsWith("Bearer ")) {
            token = token.slice(7, token.length);
        }
        const secretKey = process.env.JWT_SECRET as string;
        if(!secretKey){
            return res.status(400).send({ error: "Please provide secret key" })
        }
        const decoded = jwt.verify(token, secretKey) as jwt.JwtPayload;
        logger.debug("Decoded JWT Token", { decoded });
        // Safely extract user ID
        const userId = decoded._id;
        if (!userId) {
            // code checked
            return res.status(400).send({ error: "User ID not found in token" });
        }

        // Find user by ID
        const user = await User.findOne({ _id: userId });
        if (!user) {
            // code checked
            return res.status(404).send({ error: "User not found" });
        }

        // Ensure req.body exists before setting user
        if (!req.body) {
            req.body = {};
        }
        req.body.user = user;
        next();
    } catch (error) {
        // Pass error to error handling middleware
        // code checked
        logger.error("Authentication Error", { error });
        next(new ApiError(401, "Invalid Token Provided", error));
    }
};

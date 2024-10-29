import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/api_error";
import { User } from "../models/user.model";

/**
 * Middleware to authenticate a user based on a JWT token.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 * 
 * @returns A response with an error message if authentication fails, or calls the next middleware if successful.
 * 
 * @throws {ApiError} If the token is invalid or any other error occurs during authentication.
 * 
 * @remarks
 * - The JWT token must be provided in the `Authorization` header.
 * - The JWT secret key must be available in the environment variables as `JWT_SECRET`.
 * - The decoded token must contain a valid user ID (`_id`).
 * - The user corresponding to the decoded user ID must exist in the database.
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization;

        if (!token) {
            // code checked
            return res.status(400).send({ error: "Please provide token" });
        }
        const secretKey = process.env.JWT_SECRET as string;
        if(!secretKey){
            return res.status(400).send({ error: "Please provide secret key" })
        }
        const decoded = jwt.verify(token, secretKey) as jwt.JwtPayload;
        // console.log("decoded",decoded);
        
        
        // Safely assign decoded token and extract user ID
        const userId = decoded._id;
        if (!userId) {
            // code checked
            return res.status(400).send({ error: "JWT Secret Key not found" });
        }

        // Find user by ID
        const user = await User.findOne({ _id: userId });
        if (!user) {
            // code checked
            return res.status(404).send({ error: "User not found" });
        }

        // Middleware function within an Express.js application.
        // This line assigns a user object to the user property of the body object in the incoming request (req).
        req.body.user = user;
        next();
    } catch (error) {
        // Pass error to error handling middleware
        // code checked
        next(new ApiError(401, "Invalid Token Provided"));
    }
};

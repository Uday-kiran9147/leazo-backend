import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/api_error";
import { User } from "../models/user.model";

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

        // Attach user to the request
        req.body.user = user;
        next();
    } catch (error) {
        // Pass error to error handling middleware
        // code checked
        next(new ApiError(401, "Invalid Token Provided"));
    }
};

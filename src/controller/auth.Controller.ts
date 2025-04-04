import { Request, Response } from "express";
import { User } from "../models/user.model";
import { createUser } from "./user.controller";
import ApiError, { handleError } from "../utils/api_error";
import ApiResponse from "../utils/api_response";

// Signup controller to handle user registration
export const signUp = async (req: Request, res: Response) => {
    // console.log("Signup controller triggered");

    try {
        // Call the createUser function to register a new user
        await createUser(req, res);
    } catch (error: any) {
        let apiresponse = handleError(error,req,res)
        return res.status(apiresponse.status).json(apiresponse)
    }
};

// Login controller to authenticate a user
export const login = async (req: Request, res: Response) => {
    // console.log("Login controller triggered");

    try {
        const { email, password,deviceInfo,ipAddress } = req.body;

        // Find the user based on email and password
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findByCredentials(email, password);

        if (!user) {
            // If no user is found, throw an ApiError with status 404
            throw new ApiError(404, "User not found");
        }
        if (req.body.deviceToken) {
            // console.log("deviceToken", req.body.deviceToken);
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id },        // Search criteria: user ID
                { $set: { "deviceToken": req.body.deviceToken } },       // Update the user with the request body data
                { new: true, runValidators: true } // Return the updated user and run validations
            );
        }
        // Generate authentication token
        const token = await user.generateAccessToken();

        // Return user data and token with a 200 status code
        const apiResponse = new ApiResponse(200, "Login successful", { user, token });
        await user.trackActivity('login', deviceInfo, ipAddress);
        return res.status(200).json(apiResponse);
    } catch (error: any) {
        // For generic errors, return a 500 Internal Server Error
        const apiResponse = handleError(error,req,res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

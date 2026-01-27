import { Request, Response } from "express";
import { User } from "../models/user.model";
import { createUser } from "./user.controller";
import ApiError, { handleError } from "../utils/api_error";
import ApiResponse from "../utils/api_response";
import sendEmail from "../utils/mail";
import crypto from "crypto";
import { logger } from "../utils/logger";

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
        user.trackActivity('login', deviceInfo, ipAddress);
        return res.status(200).json(apiResponse);
    } catch (error: any) {
        // For generic errors, return a 500 Internal Server Error
        const apiResponse = handleError(error,req,res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

// Forgot Password controller
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        logger.info(`Forgot password OTP request received`, { email });

        if (!email) {
            throw new ApiError(400, "Email is required");
        }

        const user = await User.findOne({ email });

        if (!user) {
            logger.warn(`Forgot password request: User not found`, { email });
            throw new ApiError(404, "User with this email does not exist");
        }

        // Generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP and expiration (10 minutes)
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        const message = `Your Leazo password reset OTP is: ${otp}. It is valid for 10 minutes.`;

        try {
            await sendEmail({
                email: user.email,
                subject: "Leazo Password Reset OTP",
                message,
            });

            logger.info(`OTP generated and sent to email`, { email: user.email });

            return res.status(200).json(new ApiResponse(200, "OTP sent to email", {}));
        } catch (error: any) {
            logger.error(`Failed to send password reset email`, { email: user.email, error: error.message || error });
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            throw new ApiError(500, "Error sending email. Please try again later.");
        }
    } catch (error: any) {
        const apiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

// Reset Password controller
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;
        logger.info(`Password reset attempt`, { email });

        if (!email || !otp || !newPassword) {
            throw new ApiError(400, "Email, OTP, and new password are required");
        }

        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            logger.warn(`Password reset failed: Invalid or expired OTP`, { email });
            throw new ApiError(400, "Invalid OTP or OTP has expired");
        }

        // Set the new password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        logger.info(`Password reset successful`, { email });

        return res.status(200).json(new ApiResponse(200, "Password reset successful", {}));
    } catch (error: any) {
        const apiResponse = handleError(error, req, res);
        return res.status(apiResponse.status).json(apiResponse);
    }
};

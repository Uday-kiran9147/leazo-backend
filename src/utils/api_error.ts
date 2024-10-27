import mongoose from "mongoose";
import ApiResponse from "./api_response";

class ApiError extends Error {
    public statusCode: number;
    public message: string;

    constructor(statusCode: number, message: string, stack: any = '') {
        super(message);

        this.statusCode = statusCode;
        this.message = message;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export const handleError = (error: any, req: any, res: any): ApiResponse => {
    let apiResponse: ApiResponse;

    // Known API error handling
    if (error instanceof ApiError) {
        apiResponse = new ApiResponse(error.statusCode, error.message, error);
        console.error('API Error:', error.message);
        return apiResponse;
        // return res.status(error.statusCode).json(apiResponse);
    }
    // Handle Mongoose validation errors
    if (error instanceof mongoose.Error.ValidationError) {
        const errors: any = Object.values(error.errors).map((val: any) => val.message);
        apiResponse = new ApiResponse(400, errors.join(', '), error);
    } else if (error.name === 'CastError') {
        // Handle Mongoose CastError
        const message = `Resource not found. Invalid ${error.path}: ${error.value}`;
        apiResponse = new ApiResponse(404, message, error);
    }

    else {
        // Fallback for unknown errors
        console.error('Unhandled Error:', error);
        apiResponse = new ApiResponse(500, error.message, error);
    }
    // return res.status(500).json(apiResponse);
    return apiResponse;
};
export default ApiError;

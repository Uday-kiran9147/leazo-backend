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
    }

    // Mongoose ValidationError
    if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map((val: any) => val.message);
        apiResponse = new ApiResponse(400, `Validation Error: ${errors.join(', ')}`, error);
        return apiResponse;
    }

    // Mongoose CastError
    if (error.name === 'CastError') {
        const message = `Invalid ${error.path}: ${error.value}.`;
        apiResponse = new ApiResponse(400, message, error);
        return apiResponse;
    }

    // Mongoose DocumentNotFoundError
    if (error.name === 'DocumentNotFoundError') {
        const message = `Document not found.`;
        apiResponse = new ApiResponse(404, message, error);
        return apiResponse;
    }

    // MongoNetworkError - for database connection issues
    if (error.name === 'MongoNetworkError') {
        apiResponse = new ApiResponse(503, 'Database connectivity issue. Please try again later.', error);
        return apiResponse;
    }

    // JWT Token Error - when handling authorization and token validation
    if (error.name === 'JsonWebTokenError') {
        apiResponse = new ApiResponse(401, 'Invalid token. Authorization denied.', error);
        return apiResponse;
    }

    // Token Expired Error - when JWT token is expired
    if (error.name === 'TokenExpiredError') {
        apiResponse = new ApiResponse(401, 'Token expired. Please login again.', error);
        return apiResponse;
    }

    // Duplicate Key Error (MongoDB unique constraint)
    if (error.code && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const message = `Duplicate field value: ${field}. Please use another value.`;
        apiResponse = new ApiResponse(409, message, error);
        return apiResponse;
    }

    // Fallback for any unhandled errors
    console.error('Unhandled Error:', error);
    apiResponse = new ApiResponse(500, 'An unexpected error occurred.', error);

    return apiResponse;
};
export default ApiError;

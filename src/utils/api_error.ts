import mongoose from "mongoose";
import ApiResponse from "./api_response";
import { ZodError, ZodIssue } from "zod";
import { logger } from "./logger";

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

    if (error instanceof ApiError) {
        apiResponse = new ApiResponse(error.statusCode, error.message, error);
        return apiResponse;
    }

    if (error instanceof ZodError) {
        const issues = error.issues.map((err: ZodIssue) => ({
            code: err.code,
            message: err.message,
            path: err.path
        }));
        const errorMessage = issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        apiResponse = new ApiResponse(400, `Validation Error: ${errorMessage}`, { issues, name: "ZodError" });
        return apiResponse;
    }

    if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map((val: any) => val.message);
        apiResponse = new ApiResponse(400, `Validation Error: ${errors.join(', ')}`, error);
        return apiResponse;
    }

    if (error.name === 'CastError') {
        const message = `Invalid ${error.path}: ${error.value}.`;
        apiResponse = new ApiResponse(400, message, error);
        return apiResponse;
    }

    if (error.name === 'DocumentNotFoundError') {
        apiResponse = new ApiResponse(404, `Document not found.`, error);
        return apiResponse;
    }

    if (error.name === 'MongoNetworkError') {
        apiResponse = new ApiResponse(503, 'Database connectivity issue. Please try again later.', error);
        return apiResponse;
    }

    if (error.name === 'JsonWebTokenError') {
        apiResponse = new ApiResponse(401, 'Invalid token. Authorization denied.', error);
        return apiResponse;
    }

    if (error.name === 'TokenExpiredError') {
        apiResponse = new ApiResponse(401, 'Token expired. Please login again.', error);
        return apiResponse;
    }

    if (error.code && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        apiResponse = new ApiResponse(409, `Duplicate field value: ${field}. Please use another value.`, error);
        return apiResponse;
    }

    logger.error('Unhandled Error', error);
    apiResponse = new ApiResponse(500, 'An unexpected error occurred.', error);

    return apiResponse;
};
export default ApiError;

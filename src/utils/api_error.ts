import mongoose from "mongoose";
import ApiResponse from "./api_response";

/**
 * Represents an API error with a specific status code and message.
 * Extends the built-in Error class.
 * 
 * @class ApiError
 * @extends {Error}
 * 
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @property {string} message - The error message.
 * 
 * @constructor
 * @param {number} statusCode - The HTTP status code associated with the error.
 * @param {string} message - The error message.
 * @param {any} [stack=''] - Optional stack trace information. If not provided, the stack trace is captured automatically.
 */
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

/**
 * Handles various types of errors and returns a standardized API response.
 *
 * @param error - The error object that was thrown.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @returns An ApiResponse object containing the status code, message, and error details.
 *
 * Known error handling includes:
 * - `ApiError`: Custom API errors with specific status codes and messages.
 * - `mongoose.Error.ValidationError`: Mongoose validation errors.
 * - `CastError`: Mongoose cast errors for invalid object IDs.
 * - `DocumentNotFoundError`: Mongoose errors when a document is not found.
 * - `MongoNetworkError`: Database connectivity issues.
 * - `JsonWebTokenError`: JWT token errors for invalid tokens.
 * - `TokenExpiredError`: JWT token errors for expired tokens.
 * - Duplicate key errors (MongoDB unique constraint violations).
 *
 * For any unhandled errors, a generic 500 status code response is returned.
 */
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

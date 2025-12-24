import { Request, Response, NextFunction } from 'express';
import ApiError, { handleError } from '../utils/api_error';
import ApiResponse from '../utils/api_response';

/**
 * Global Error Handling Middleware
 */
export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiResponse = handleError(err, req, res);
    
    // If it's a 500 error, we might want to log the full stack trace for internal debugging
    if (apiResponse.status === 500) {
        console.error(`[Internal Server Error] ${req.method} ${req.url}`, err);
    }

    return res.status(apiResponse.status).json(apiResponse);
};

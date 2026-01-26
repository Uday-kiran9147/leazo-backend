import { Request, Response, NextFunction } from 'express';
import ApiError, { handleError } from '../utils/api_error';
import ApiResponse from '../utils/api_response';
import { logger } from '../utils/logger';

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
    
    // If it's a 500 error, we log the full error with metadata
    if (apiResponse.status === 500) {
        logger.error(`Internal Server Error: ${req.method} ${req.url}`, {
            error: err.message,
            stack: err.stack,
            body: req.body,
            query: req.query,
            params: req.params,
            user: (req as any).user?.id
        });
    }

    return res.status(apiResponse.status).json(apiResponse);
};

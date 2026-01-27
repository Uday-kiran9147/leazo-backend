import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError, ZodIssue } from 'zod';
import ApiResponse from '../utils/api_response';

/**
 * Generic Validation Middleware
 * @param schema - Zod schema to validate against
 */
export const validate = (schema: ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues.map((err: ZodIssue) => ({
                    code: err.code,
                    message: err.message,
                    path: err.path
                }));
                const errorMessage = issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
                const apiResponse = new ApiResponse(400, `Validation Error: ${errorMessage}`, { issues, name: "ZodError" });
                return res.status(apiResponse.status).json(apiResponse);
            }
            return next(error);
        }
    };
};

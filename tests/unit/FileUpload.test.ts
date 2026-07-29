import { Request, Response, NextFunction } from 'express';
import { handleError } from '../../src/utils/api_error';
import multer from 'multer';

describe('File Upload & Multer Error Handling', () => {
    it('should convert MulterError to 400 Bad Request', () => {
        const multerErr = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file');
        const req = {} as Request;
        const res = {} as Response;

        const response = handleError(multerErr, req, res);

        expect(response.status).toBe(400);
        expect(response.message).toContain('File upload error');
        expect(response.message).toContain('Unexpected field');
    });
});

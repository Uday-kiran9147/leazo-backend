import { Request, Response, NextFunction } from 'express';
import { validate } from '../../src/middleware/validate.middleware';
import { auth } from '../../src/middleware/auth.middleware';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/user.model';

jest.mock('../../src/models/user.model');
jest.mock('jsonwebtoken');

describe('Middleware Tests', () => {
    describe('Validation Middleware', () => {
        const schema = z.object({
            body: z.object({
                name: z.string().min(3)
            })
        });

        it('should call next() if validation passes', async () => {
            const req = { body: { name: 'John Doe' } } as Request;
            const res = {} as Response;
            const next = jest.fn() as NextFunction;

            await validate(schema)(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        it('should return 400 if validation fails', async () => {
            const req = { body: { name: 'Jo' } } as Request;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis()
            } as unknown as Response;
            const next = jest.fn() as NextFunction;

            await validate(schema)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Auth Middleware', () => {
        const mockSecret = 'testsecret';
        process.env.JWT_SECRET = mockSecret;

        it('should call next() if token is valid', async () => {
            const req = { headers: { authorization: 'validtoken' }, body: {} } as Request;
            const res = {} as Response;
            const next = jest.fn() as NextFunction;

            (jwt.verify as jest.Mock).mockReturnValue({ _id: 'user123' });
            (User.findOne as jest.Mock).mockResolvedValue({ _id: 'user123', email: 'test@test.com' });

            await auth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.body.user).toBeDefined();
        });

        it('should return 400 if token is missing', async () => {
            const req = { headers: {}, body: {} } as Request;
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn().mockReturnThis()
            } as unknown as Response;
            const next = jest.fn() as NextFunction;

            await auth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ error: 'Please provide token' });
        });

        it('should return 401 if token is invalid', async () => {
            const req = { headers: { authorization: 'invalidtoken' }, body: {} } as Request;
            const res = {} as Response;
            const next = jest.fn() as NextFunction;

            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });

            await auth(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
        });
    });
});

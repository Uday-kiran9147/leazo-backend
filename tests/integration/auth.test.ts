import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';

describe('Auth Integration Tests', () => {
    const testUser = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890'
    };

    it('should signup a new user', async () => {
        const response = await request(app)
            .post('/api/auth/sign-up')
            .send(testUser);

        // Debugging if failed
        if (response.status !== 201) {
            console.log(response.body);
        }

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Account created successfully');
        expect(response.body.data.user.email).toBe(testUser.email);
        
        const user = await User.findOne({ email: testUser.email });
        expect(user).toBeTruthy();
    });

    it('should login an existing user', async () => {
        // First signup
        await request(app).post('/api/auth/sign-up').send(testUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.data.token).toBeTruthy();
        expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail login with incorrect password', async () => {
        await request(app).post('/api/auth/sign-up').send(testUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(response.status).toBe(400); // Check ApiError status in findByCredentials
    });
});

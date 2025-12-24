import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';
import { Owner } from '../../src/models/owner.model';
import { Building } from '../../src/models/building.model';
import { Portion } from '../../src/models/portion.model';

describe('Owner Integration Tests', () => {
    let token: string;
    let userId: string;

    const testUser = {
        email: 'owner@example.com',
        password: 'Password123!',
        firstName: 'Owner',
        lastName: 'User',
        phoneNumber: '1234567890'
    };

    beforeAll(async () => {
        // Signup and Login to get token
        await request(app).post('/api/auth/sign-up').send(testUser);
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });
        token = loginRes.body.data.token;
        userId = loginRes.body.data.user._id;
    });

    it('should create an owner profile', async () => {
        const ownerData = {
            ownerName: 'Leazo Properties',
            contact: '9876543210'
        };

        const response = await request(app)
            .post('/api/owners/create-owner')
            .set('Authorization ', token)
            .send(ownerData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Owner created successfully');
        expect(response.body.data.ownerName).toBe(ownerData.ownerName);

        // Verify user status updated
        const user = await User.findById(userId);
        expect(user?.isOwner).toBe(true);
        expect(user?.ownerId).toBeTruthy();
    });

    it('should create a building for the owner', async () => {
        // Get user to have ownerId
        const user = await User.findById(userId);
        
        const buildingData = {
            ownerId: user?.ownerId,
            buildingName: 'Leazo Heights',
            address: {
                city: 'Hyderabad',
                locality: 'Madhapur',
                state: 'Telangana',
                country: 'India',
                zipCode: '500081'
            },
            contact: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            }
        };

        const response = await request(app)
            .post('/api/owners/create-building')
            .set('Authorization', token)
            .send(buildingData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Building created successfully');
        expect(response.body.data.buildingName).toBe(buildingData.buildingName);
    });

    it('should create a portion for a building', async () => {
        // First get the building id
        const buildingsRes = await request(app)
            .get('/api/owners/buildings/me')
            .set('Authorization', token);
        
        const buildingId = buildingsRes.body.data[0]._id;

        const portionData = {
            buildingId: buildingId,
            title: '1BHK Luxury Suite',
            price: 15000,
            address: {
                city: 'Hyderabad',
                locality: 'Madhapur',
                state: 'Telangana',
                country: 'India',
                zipCode: '500081'
            }
        };

        const response = await request(app)
            .post('/api/owners/buildings/create-portion')
            .set('Authorization', token)
            .send(portionData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Portion created successfully');
        expect(response.body.data.title).toBe(portionData.title);
    });
});

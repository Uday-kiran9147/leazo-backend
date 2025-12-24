import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';

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

    beforeEach(async () => {
    // Signup and Login to get token for EVERY test because setup.ts clears DB
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
            contactNumber: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            email: 'owner@example.com'
        };

        const response = await request(app)
            .post('/api/owners/create-owner')
            .set('Authorization', token)
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
        // Create owner first
        const ownerData = {
            ownerName: 'Leazo Properties',
            contactNumber: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            email: 'owner@example.com'
        };
        await request(app)
            .post('/api/owners/create-owner')
            .set('Authorization', token)
            .send(ownerData);

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
            },
            availabilityStatus: 'available',
            floors: 5,
            parking: true
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
        // Create owner
        const ownerData = {
            ownerName: 'Leazo Properties',
            contactNumber: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            email: 'owner@example.com'
        };
        await request(app)
            .post('/api/owners/create-owner')
            .set('Authorization', token)
            .send(ownerData);

        const user = await User.findById(userId);

        // Create building
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
            },
            availabilityStatus: 'available',
            floors: 5,
            parking: true
        };
        const buildingRes = await request(app)
            .post('/api/owners/create-building')
            .set('Authorization', token)
            .send(buildingData);
        
        const buildingId = buildingRes.body.data._id;

        const portionData = {
            buildingId: buildingId,
            title: '1BHK Luxury Suite',
            description: 'Beautiful 1BHK with city view',
            price: 15000,
            portionNumber: '101',
            floor: '1st',
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
            },
            availabilityStatus: 'available'
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

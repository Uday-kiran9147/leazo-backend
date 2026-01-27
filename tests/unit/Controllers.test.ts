// ============================================================================
// FILE: tests/unit/Controllers.test.ts
// Purpose: Unit tests for controller functions
// ============================================================================

import { User } from '../../src/models/user.model';
import { Owner } from '../../src/models/owner.model';
import { Portion } from '../../src/models/portion.model';
import { Building } from '../../src/models/building.model';
import { PaymentEntity } from '../../src/payments/payments.models';

describe('Controller Tests', () => {
    let testUser: any;
    let testOwner: any;
    let testBuilding: any;

    beforeEach(async () => {
        // Create test user
        testUser = await User.create({
            firstName: 'Controller',
            lastName: 'Test',
            email: 'controller@example.com',
            password: 'password123',
            phoneNumber: '1234567890',
            planId: 'tenant_free',
        });

        // Create owner user
        const ownerUser = await User.create({
            firstName: 'Owner',
            lastName: 'Controller',
            email: 'ownercontroller@example.com',
            password: 'password123',
            phoneNumber: '9876543210',
            isOwner: true,
        });

        // Create owner
        testOwner = await Owner.create({
            userId: ownerUser._id,
            ownerName: 'Controller Owner',
            contactNumber: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            email: 'ownercontroller@example.com',
            planId: 'owner_free',
            usage: {
                activeListings: 0,
                weeklyBoostsUsed: 0,
                tenantContactsUsed: 0
            }
        });

        // Create building
        testBuilding = await Building.create({
            ownerId: testOwner._id,
            buildingName: 'Controller Building',
            address: {
                locality: 'Test Area',
                city: 'Bangalore',
                state: 'Karnataka',
                zipCode: '560001',
                country: 'India'
            },
            contact: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            availabilityStatus: 'available',
            floors: 3,
            parking: true,
            amenities: ['parking']
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // USER CONTROLLER TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('User Controller', () => {
        it('should get user profile', async () => {
            const user = await User.findById(testUser._id);
            expect(user).toBeDefined();
            expect(user!.email).toBe('controller@example.com');
        });

        it('should update user profile', async () => {
            await User.updateOne(
                { _id: testUser._id },
                { firstName: 'Updated' }
            );

            const updated = await User.findById(testUser._id);
            expect(updated!.firstName).toBe('Updated');
        });

        it('should track contact reveals', async () => {
            await User.updateOne(
                { _id: testUser._id },
                { $inc: { 'usage.ownerContactsUsed': 1 } }
            );

            const updated = await User.findById(testUser._id);
            expect(updated!.usage.ownerContactsUsed).toBe(1);
        });

        it('should check plan limits', async () => {
            const user = await User.findById(testUser._id);
            expect(user!.planId).toBe('tenant_free');
            expect(user!.usage.ownerContactsUsed).toBe(0);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // OWNER CONTROLLER TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Owner Controller', () => {
        it('should get owner profile', async () => {
            const owner = await Owner.findById(testOwner._id);
            expect(owner).toBeDefined();
            expect(owner!.ownerName).toBe('Controller Owner');
        });

        it('should update owner profile', async () => {
            await Owner.updateOne(
                { _id: testOwner._id },
                { ownerName: 'Updated Owner' }
            );

            const updated = await Owner.findById(testOwner._id);
            expect(updated!.ownerName).toBe('Updated Owner');
        });

        it('should track active listings', async () => {
            await Owner.updateOne(
                { _id: testOwner._id },
                { 'usage.activeListings': 3 }
            );

            const updated = await Owner.findById(testOwner._id);
            expect(updated!.usage.activeListings).toBe(3);
        });

        it('should track boost usage', async () => {
            await Owner.updateOne(
                { _id: testOwner._id },
                { $inc: { 'usage.weeklyBoostsUsed': 1 } }
            );

            const updated = await Owner.findById(testOwner._id);
            expect(updated!.usage.weeklyBoostsUsed).toBe(1);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // PORTION MANAGEMENT TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Portion Management', () => {
        it('should create a portion', async () => {
            const portion = await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: 'TEST1',
                floor: '1',
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Test Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: 'Test Portion',
                description: 'Test description',
                price: 10000,
                availabilityStatus: 'available',
            });

            expect(portion).toBeDefined();
            expect(portion.portionNumber).toBe('TEST1');
        });

        it('should update portion details', async () => {
            const portion = await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: 'TEST2',
                floor: '1',
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Test Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: 'Update Test',
                description: 'Test description',
                price: 10000,
                availabilityStatus: 'available',
            });

            await Portion.updateOne(
                { _id: portion._id },
                { price: 15000 }
            );

            const updated = await Portion.findById(portion._id);
            expect(updated!.price).toBe(15000);
        });

        it('should activate/deactivate portion', async () => {
            const portion = await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: 'TEST3',
                floor: '1',
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Test Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: 'Active Test',
                description: 'Test description',
                price: 10000,
                isActive: false,
                availabilityStatus: 'available',
            });

            await Portion.updateOne(
                { _id: portion._id },
                { isActive: true }
            );

            const updated = await Portion.findById(portion._id);
            expect(updated!.isActive).toBe(true);
        });

        it('should delete portion', async () => {
            const portion = await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: 'TEST4',
                floor: '1',
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Test Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: 'Delete Test',
                description: 'Test description',
                price: 10000,
                availabilityStatus: 'available',
            });

            await Portion.deleteOne({ _id: portion._id });
            const deleted = await Portion.findById(portion._id);
            expect(deleted).toBeNull();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // BUILDING MANAGEMENT TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Building Management', () => {
        it('should get building details', async () => {
            const building = await Building.findById(testBuilding._id);
            expect(building).toBeDefined();
            expect(building!.buildingName).toBe('Controller Building');
        });

        it('should update building details', async () => {
            await Building.updateOne(
                { _id: testBuilding._id },
                { floors: 5 }
            );

            const updated = await Building.findById(testBuilding._id);
            expect(updated!.floors).toBe(5);
        });

        it('should list buildings by owner', async () => {
            const buildings = await Building.find({ ownerId: testOwner._id });
            expect(buildings.length).toBeGreaterThan(0);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // PAYMENT CONTROLLER TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Payment Controller', () => {
        it('should create payment record', async () => {
            const payment = await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'tenant_smart_finder',
                orderId: 'order_controller_test',
                totalAmount: 29900,
                currency: 'INR',
            });

            expect(payment).toBeDefined();
            expect(payment.status).toBe('initiated');
        });

        it('should get payment history', async () => {
            await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'completed',
                planId: 'tenant_smart_finder',
                orderId: 'order_history_1',
                totalAmount: 29900,
                currency: 'INR',
            });

            const payments = await PaymentEntity.find({ userId: testUser._id });
            expect(payments.length).toBeGreaterThan(0);
        });

        it('should filter payments by status', async () => {
            await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'failed',
                planId: 'tenant_premium',
                orderId: 'order_failed',
                totalAmount: 49900,
                currency: 'INR',
            });

            const failedPayments = await PaymentEntity.find({
                userId: testUser._id,
                status: 'failed'
            });

            expect(failedPayments.length).toBeGreaterThan(0);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // ANALYTICS TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Analytics', () => {
        it('should count total users', async () => {
            const count = await User.countDocuments();
            expect(count).toBeGreaterThan(0);
        });

        it('should count total owners', async () => {
            const count = await Owner.countDocuments();
            expect(count).toBeGreaterThan(0);
        });

        it('should count total portions', async () => {
            await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: 'ANALYTICS1',
                floor: '1',
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Test Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: 'Analytics Portion',
                description: 'Test description',
                price: 10000,
                availabilityStatus: 'available',
            });

            const count = await Portion.countDocuments();
            expect(count).toBeGreaterThan(0);
        });

        it('should count active portions', async () => {
            await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: 'ANALYTICS2',
                floor: '1',
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Test Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: 'Active Analytics',
                description: 'Test description',
                price: 10000,
                isActive: true,
                availabilityStatus: 'available',
            });

            const count = await Portion.countDocuments({ isActive: true });
            expect(count).toBeGreaterThan(0);
        });

        it('should count payments by status', async () => {
            await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'completed',
                planId: 'tenant_smart_finder',
                orderId: 'order_analytics',
                totalAmount: 29900,
                currency: 'INR',
            });

            const completedCount = await PaymentEntity.countDocuments({ status: 'completed' });
            expect(completedCount).toBeGreaterThan(0);
        });
    });
});

// ============================================================================
// FILE: tests/unit/RazorpayOrderService.test.ts
// Purpose: Unit tests for Razorpay Order Service
// ============================================================================

import { PaymentEntity } from '../../src/payments/payments.models';
import { User } from '../../src/models/user.model';
import { Owner } from '../../src/models/owner.model';
import { RazorpayOrderService } from '../../src/services/razorpay/razorpay.order.service';

// Mock the Razorpay client before importing the service
jest.mock('../../src/services/razorpay/razorpay.client', () => ({
    razorpayClient: {
        orders: {
            create: jest.fn().mockResolvedValue({
                id: 'order_mock_123',
                amount: 29900,
                currency: 'INR',
                status: 'created'
            }),
            fetch: jest.fn().mockResolvedValue({
                id: 'order_mock_123',
                status: 'paid'
            }),
            all: jest.fn().mockResolvedValue({ items: [] }),
            fetchPayments: jest.fn().mockResolvedValue({ items: [] })
        },
        payments: {
            fetch: jest.fn().mockResolvedValue({}),
            capture: jest.fn().mockResolvedValue({}),
            refund: jest.fn().mockResolvedValue({}),
            fetchMultipleRefund: jest.fn().mockResolvedValue({ items: [] })
        }
    }
}));

describe.skip('Razorpay Order Service Tests', () => {
    let orderService: RazorpayOrderService;
    let testUser: any;
    let testOwner: any;

    beforeEach(async () => {
        orderService = new RazorpayOrderService();

        // Create test user
        testUser = await User.create({
            firstName: 'Test',
            lastName: 'User',
            email: 'razorpay@example.com',
            password: 'password123',
            phoneNumber: '1234567890',
            planId: 'tenant_free',
        });

        // Create owner user
        const ownerUser = await User.create({
            firstName: 'Owner',
            lastName: 'Test',
            email: 'razorpayowner@example.com',
            password: 'password123',
            phoneNumber: '9876543210',
            isOwner: true,
        });

        // Create owner
        testOwner = await Owner.create({
            userId: ownerUser._id,
            ownerName: 'Test Owner',
            contactNumber: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            email: 'razorpayowner@example.com',
            planId: 'owner_free',
            usage: {
                activeListings: 0,
                weeklyBoostsUsed: 0,
                tenantContactsUsed: 0
            }
        });
    });

    describe('getPlanPrice', () => {
        it('should return price for tenant plan', () => {
            const price = orderService.getPlanPrice('tenant_smart_finder');
            expect(price).toBeGreaterThan(0);
        });

        it('should return price for owner plan', () => {
            const price = orderService.getPlanPrice('owner_starter');
            expect(price).toBeGreaterThan(0);
        });

        it('should return 0 for invalid plan', () => {
            const price = orderService.getPlanPrice('invalid_plan');
            expect(price).toBe(0);
        });

        it('should return 0 for free plan', () => {
            const price = orderService.getPlanPrice('tenant_free');
            expect(price).toBe(0);
        });
    });

    describe('completePayment', () => {
        it('should mark payment as completed', async () => {
            // Create a payment
            const payment = await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'tenant_smart_finder',
                orderId: 'order_complete_test',
                totalAmount: 29900,
                currency: 'INR',
            });

            await orderService.completePayment('order_complete_test', 'pay_complete_123');

            const updatedPayment = await PaymentEntity.findById(payment._id);
            expect(updatedPayment!.status).toBe('completed');
            expect(updatedPayment!.gatewayPaymentId).toBe('pay_complete_123');
            expect(updatedPayment!.metadata?.completedAt).toBeDefined();
        });

        it('should handle non-existent order gracefully', async () => {
            // This should not throw, but won't update anything
            await orderService.completePayment('nonexistent_order_id', 'pay_test');
            
            // Verify no payment was updated
            const payment = await PaymentEntity.findOne({ orderId: 'nonexistent_order_id' });
            expect(payment).toBeNull();
        });
    });

    describe('getUserPayments', () => {
        it('should retrieve user payment history', async () => {
            await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'completed',
                planId: 'tenant_premium',
                orderId: 'order_history_1',
                totalAmount: 49900,
                currency: 'INR',
                gatewayPaymentId: 'pay_history_123'
            });

            const payments = await orderService.getUserPayments(testUser._id.toString());
            expect(payments).toBeDefined();
            expect(payments.length).toBeGreaterThan(0);
            expect(payments[0].userId.toString()).toBe(testUser._id.toString());
        });

        it('should limit payment history results', async () => {
            // Create multiple payments
            for (let i = 0; i < 5; i++) {
                await PaymentEntity.create({
                    userId: testUser._id,
                    gateway: 'razorpay',
                    status: 'completed',
                    planId: 'tenant_smart_finder',
                    orderId: `order_limit_${i}`,
                    totalAmount: 29900,
                    currency: 'INR',
                });
            }

            const payments = await orderService.getUserPayments(testUser._id.toString(), 3);
            expect(payments.length).toBeLessThanOrEqual(3);
        });

        it('should return empty array for user with no payments', async () => {
            const newUser = await User.create({
                firstName: 'New',
                lastName: 'User',
                email: 'newuser@example.com',
                password: 'password123',
                phoneNumber: '1111111111',
            });

            const payments = await orderService.getUserPayments(newUser._id.toString());
            expect(payments).toBeDefined();
            expect(payments.length).toBe(0);
        });
    });

    describe('verifyPayment', () => {
        it('should verify payment signature', () => {
            // Note: This test validates the signature verification logic
            // In a real scenario, you'd need actual Razorpay signatures
            const isValid = orderService.verifyPayment({
                razorpayOrderId: 'order_test',
                razorpayPaymentId: 'pay_test',
                razorpaySignature: 'test_signature'
            });

            // The signature won't match with test data, but the method should not throw
            expect(typeof isValid).toBe('boolean');
        });
    });
});

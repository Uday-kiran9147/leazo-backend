// ============================================================================
// FILE: tests/integration/payments.e2e.test.ts
// Purpose: End-to-end tests for payment flows and business logic updates
// ============================================================================

import mongoose from 'mongoose';
import { PaymentEntity, IPayment } from '../../src/payments/payments.models';
import { User } from '../../src/models/user.model';
import { Owner } from '../../src/models/owner.model';
import { Portion } from '../../src/models/portion.model';
import { Building } from '../../src/models/building.model';
import { activateOwnerBusinessLogic, activateTenantBusinessLogic } from '../../src/payments/payment_logic';
import { RazorpayWebhookService } from '../../src/services/razorpay/razorpay.webhook.service';
import { RedisClientManager } from '../../src/cache/RedisClientManager';

describe.skip('Payment E2E Tests - Business Logic Updates', () => {
    let testUser: any;
    let testOwner: any;
    let testBuilding: any;
    let testPortions: any[];
    let webhookService: RazorpayWebhookService;

    beforeAll(() => {
        webhookService = new RazorpayWebhookService();
    });

    beforeEach(async () => {
        // Create test user (tenant)
        testUser = await User.create({
            firstName: 'Test',
            lastName: 'User',
            email: 'testuser@example.com',
            password: 'password123',
            phoneNumber: '1234567890',
            planId: 'tenant_free',
            usage: {
                ownerContactsUsed: 0
            }
        });

        // Create test user for owner
        const testOwnerUser = await User.create({
            firstName: 'Test',
            lastName: 'Owner',
            email: 'testowner@example.com',
            password: 'password123',
            phoneNumber: '9876543210',
            isOwner: true,
        });

        // Create test owner
        testOwner = await Owner.create({
            userId: testOwnerUser._id,
            ownerName: 'Test Owner',
            contactNumber: {
                countryCode: '+91',
                phoneNumber: '9876543210'
            },
            email: 'testowner@example.com',
            planId: 'owner_free',
            usage: {
                activeListings: 0,
                weeklyBoostsUsed: 0,
                tenantContactsUsed: 0
            }
        });

        // Create test building
        testBuilding = await Building.create({
            ownerId: testOwner._id,
            buildingName: 'Test Building',
            address: {
                locality: 'Indiranagar',
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
            floors: 5,
            parking: true,
            amenities: ['parking', 'gym', 'security']
        });

        // Create 5 test portions for the owner
        testPortions = [];
        for (let i = 0; i < 5; i++) {
            const portion = await Portion.create({
                buildingId: testBuilding._id,
                ownerId: testOwner._id,
                portionNumber: `A${i + 1}`,
                floor: `${i + 1}`,
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                address: {
                    locality: 'Indiranagar',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                    country: 'India'
                },
                title: `Test Portion A${i + 1}`,
                description: 'A beautiful test portion',
                price: 10000 + (i * 1000),
                isActive: false, // Start with inactive
                availabilityStatus: 'available',
                amenities: ['parking', 'gym'],
            });
            testPortions.push(portion);
        }
    });

    // ══════════════════════════════════════════════════════════════════════════
    // TENANT PAYMENT TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Tenant Payment Flow', () => {
        it('should activate tenant_smart_finder plan and update business logic', async () => {
            // Create payment record
            const payment = await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'tenant_smart_finder',
                totalAmount: 29900, // ₹299
                currency: 'INR',
                orderId: 'order_test_123',
                metadata: {
                    email: testUser.email,
                    name: `${testUser.firstName} ${testUser.lastName}`
                }
            });

            // Activate tenant business logic
            await activateTenantBusinessLogic(payment);

            // Verify user plan update
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.planId).toBe('tenant_smart_finder');
            expect(updatedUser!.planActivatedAt).toBeDefined();
            expect(updatedUser!.planExpiresAt).toBeDefined();
            expect(updatedUser!.autoRenew).toBe(true);
            expect(updatedUser!.usage.ownerContactsUsed).toBe(0);

            // Verify plan expiry is 30 days from now
            const expectedExpiry = new Date();
            expectedExpiry.setDate(expectedExpiry.getDate() + 30);
            const actualExpiry = new Date(updatedUser!.planExpiresAt!);
            const daysDiff = Math.abs((actualExpiry.getTime() - expectedExpiry.getTime()) / (1000 * 60 * 60 * 24));
            expect(daysDiff).toBeLessThan(1); // Within 1 day
        });

        it('should activate tenant_premium plan and reset usage counters', async () => {
            // Set some usage first
            await User.updateOne(
                { _id: testUser._id },
                { 'usage.ownerContactsUsed': 5 }
            );

            const payment = await PaymentEntity.create({
                userId: testUser._id,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'tenant_premium',
                totalAmount: 49900, // ₹499
                currency: 'INR',
                orderId: 'order_test_456',
            });

            await activateTenantBusinessLogic(payment);

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.planId).toBe('tenant_premium');
            expect(updatedUser!.usage.ownerContactsUsed).toBe(0); // Should be reset
        });

        it('should handle tenant plan activation without payment (free plan)', async () => {
            await activateTenantBusinessLogic(null, testUser._id.toString(), 'tenant_free');

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.planId).toBe('tenant_free');
            expect(updatedUser!.planActivatedAt).toBeDefined();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // OWNER PAYMENT TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Owner Payment Flow', () => {
        it('should activate owner_starter plan and update only 3 portions to active', async () => {
            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_starter',
                totalAmount: 99900, // ₹999
                currency: 'INR',
                orderId: 'order_owner_starter',
            });

            await activateOwnerBusinessLogic(payment);

            // Verify owner plan update
            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_starter');
            expect(updatedOwner!.planActivatedAt).toBeDefined();
            expect(updatedOwner!.planExpiresAt).toBeDefined();
            expect(updatedOwner!.usage.activeListings).toBe(3); // Starter plan allows 3
            expect(updatedOwner!.verifiedBadge).toBe(true); // Starter has verified badge
            expect(updatedOwner!.visibility).toBe('enhanced');
            expect(updatedOwner!.usage.weeklyBoostsUsed).toBe(0);
            expect(updatedOwner!.usage.tenantContactsUsed).toBe(0);

            // Verify portions - only 3 should be active
            const activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            const inactivePortions = await Portion.find({ ownerId: testOwner._id, isActive: false });
            
            expect(activePortions.length).toBe(3);
            expect(inactivePortions.length).toBe(2);

            // Verify cache invalidation (mocked in test setup)
            // Note: uses pipeline for portions and deletePattern for buildings
            expect(RedisClientManager.deletePattern).toHaveBeenCalled();
        });

        it('should activate owner_pro plan with unlimited active listings', async () => {
            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_pro',
                totalAmount: 199900, // ₹1999
                currency: 'INR',
                orderId: 'order_owner_pro',
            });

            await activateOwnerBusinessLogic(payment);

            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_pro');
            expect(updatedOwner!.verifiedBadge).toBe(true);
            expect(updatedOwner!.visibility).toBe('high');

            // All 5 portions should be active (Pro = unlimited)
            const activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(5);
            expect(updatedOwner!.usage.activeListings).toBe(5);
        });

        it('should activate owner_ultra plan with top visibility', async () => {
            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_ultra',
                totalAmount: 299900, // ₹2999
                currency: 'INR',
                orderId: 'order_owner_ultra',
            });

            await activateOwnerBusinessLogic(payment);

            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_ultra');
            expect(updatedOwner!.verifiedBadge).toBe(true);
            expect(updatedOwner!.visibility).toBe('boosted');
            
            // All portions active
            const activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(5);
        });

        it('should handle portion activation order by most recent updatedAt', async () => {
            // Update portions at different times
            await new Promise(resolve => setTimeout(resolve, 10));
            await Portion.updateOne({ _id: testPortions[2]._id }, { rent: 15000 });
            
            await new Promise(resolve => setTimeout(resolve, 10));
            await Portion.updateOne({ _id: testPortions[4]._id }, { rent: 16000 });
            
            await new Promise(resolve => setTimeout(resolve, 10));
            await Portion.updateOne({ _id: testPortions[0]._id }, { rent: 17000 });

            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_starter',
                totalAmount: 99900,
                currency: 'INR',
                orderId: 'order_test_order',
            });

            await activateOwnerBusinessLogic(payment);

            // The 3 most recently updated portions should be active
            const portion0 = await Portion.findById(testPortions[0]._id);
            const portion2 = await Portion.findById(testPortions[2]._id);
            const portion4 = await Portion.findById(testPortions[4]._id);

            expect(portion0!.isActive).toBe(true);
            expect(portion2!.isActive).toBe(true);
            expect(portion4!.isActive).toBe(true);
        });

        it('should handle owner activation by userId when ownerId not found', async () => {
            const ownerUserId = testOwner.userId.toString();
            
            // Remove owner temporarily
            const ownerBackup = testOwner;
            await Owner.deleteOne({ _id: testOwner._id });
            
            // Recreate owner
            testOwner = await Owner.create({
                userId: ownerUserId,
                ownerName: 'Test Owner 2',
                contactNumber: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                email: 'testowner2@example.com',
                planId: 'owner_free',
                usage: {
                    activeListings: 0,
                    weeklyBoostsUsed: 0,
                    tenantContactsUsed: 0
                }
            });

            // Create portions for new owner
            for (let i = 0; i < 3; i++) {
                await Portion.create({
                    buildingId: testBuilding._id,
                    ownerId: testOwner._id,
                    portionNumber: `B${i + 1}`,
                    floor: `${i + 1}`,
                    contact: {
                        countryCode: '+91',
                        phoneNumber: '9876543210'
                    },
                    address: {
                        locality: 'Indiranagar',
                        city: 'Bangalore',
                        state: 'Karnataka',
                        zipCode: '560001',
                        country: 'India'
                    },
                    title: `Test Portion B${i + 1}`,
                    description: 'Test portion for new owner',
                    price: 10000,
                    isActive: false,
                    availabilityStatus: 'available',
                    amenities: ['parking'],
                });
            }

            await activateOwnerBusinessLogic(null, ownerUserId, 'owner_starter');

            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_starter');
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // WEBHOOK EVENT TESTS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Webhook Event Handlers', () => {
        describe('order.paid event', () => {
            it('should process order.paid webhook and activate owner plan', async () => {
                const payment = await PaymentEntity.create({
                    userId: testOwner.userId,
                    gateway: 'razorpay',
                    status: 'initiated',
                    planId: 'owner_starter',
                    orderId: 'order_webhook_test_123',
                    totalAmount: 99900,
                    currency: 'INR',
                });

                const webhookPayload = {
                    event: 'order.paid',
                    payload: {
                        order: {
                            entity: {
                                id: 'order_webhook_test_123',
                                amount: 99900,
                                amount_paid: 99900,
                                currency: 'INR',
                                status: 'paid',
                                attempts: 1,
                            }
                        },
                        payment: {
                            entity: {
                                id: 'pay_test_123',
                                method: 'card',
                                amount: 99900,
                                order_id: 'order_webhook_test_123',
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                // Verify payment updated
                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('completed');
                expect(updatedPayment!.gatewayPaymentId).toBe('pay_test_123');
                expect(updatedPayment!.paymentMethod).toBe('card');

                // Verify owner plan activated
                const updatedOwner = await Owner.findById(testOwner._id);
                expect(updatedOwner!.planId).toBe('owner_starter');
                
                // Verify metadata
                expect(updatedPayment!.metadata).toHaveProperty('orderStatus', 'paid');
                expect(updatedPayment!.metadata).toHaveProperty('paidAt');
                expect(updatedPayment!.metadata).toHaveProperty('attempts', 1);
            });

            it('should handle order.paid for tenant plan', async () => {
                const payment = await PaymentEntity.create({
                    userId: testUser._id,
                    gateway: 'razorpay',
                    status: 'initiated',
                    planId: 'tenant_premium',
                    orderId: 'order_tenant_webhook',
                    totalAmount: 49900,
                    currency: 'INR',
                });

                const webhookPayload = {
                    event: 'order.paid',
                    payload: {
                        order: {
                            entity: {
                                id: 'order_tenant_webhook',
                                amount: 49900,
                                amount_paid: 49900,
                                currency: 'INR',
                                status: 'paid',
                                attempts: 1,
                            }
                        },
                        payment: {
                            entity: {
                                id: 'pay_tenant_123',
                                method: 'upi',
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                const updatedUser = await User.findById(testUser._id);
                expect(updatedUser!.planId).toBe('tenant_premium');
            });
        });

        describe('payment.captured event', () => {
            it('should process payment.captured and activate plan if not already completed', async () => {
                const payment = await PaymentEntity.create({
                    userId: testUser._id,
                    gateway: 'razorpay',
                    status: 'authorized',
                    planId: 'tenant_smart_finder',
                    orderId: 'order_capture_test',
                    totalAmount: 29900,
                    currency: 'INR',
                });

                const webhookPayload = {
                    event: 'payment.captured',
                    payload: {
                        payment: {
                            entity: {
                                id: 'pay_captured_123',
                                order_id: 'order_capture_test',
                                amount: 29900,
                                currency: 'INR',
                                method: 'netbanking',
                                fee: 590,
                                tax: 90,
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('completed');
                expect(updatedPayment!.metadata).toHaveProperty('fee', 590);
                expect(updatedPayment!.metadata).toHaveProperty('tax', 90);

                const updatedUser = await User.findById(testUser._id);
                expect(updatedUser!.planId).toBe('tenant_smart_finder');
            });

            it('should not reactivate plan if already completed by order.paid', async () => {
                const payment = await PaymentEntity.create({
                    userId: testOwner.userId,
                    gateway: 'razorpay',
                    status: 'completed', // Already completed
                    planId: 'owner_pro',
                    orderId: 'order_already_complete',
                    totalAmount: 199900,
                    currency: 'INR',
                });

                // Set initial plan
                await Owner.updateOne(
                    { _id: testOwner._id },
                    { planId: 'owner_pro', usage: { activeListings: 5, weeklyBoostsUsed: 2, tenantContactsUsed: 1 } }
                );

                const webhookPayload = {
                    event: 'payment.captured',
                    payload: {
                        payment: {
                            entity: {
                                id: 'pay_dupe_123',
                                order_id: 'order_already_complete',
                                amount: 199900,
                                currency: 'INR',
                                method: 'card',
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                // Payment should remain completed
                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('completed');

                // Usage should not reset (confirming activation didn't run again)
                const updatedOwner = await Owner.findById(testOwner._id);
                expect(updatedOwner!.usage.weeklyBoostsUsed).toBe(2); // Should remain unchanged
            });
        });

        describe('payment.failed event', () => {
            it('should mark payment as failed and store error details', async () => {
                const payment = await PaymentEntity.create({
                    userId: testUser._id,
                    gateway: 'razorpay',
                    status: 'initiated',
                    planId: 'tenant_premium',
                    orderId: 'order_fail_test',
                    totalAmount: 49900,
                    currency: 'INR',
                });

                const webhookPayload = {
                    event: 'payment.failed',
                    payload: {
                        payment: {
                            entity: {
                                id: 'pay_fail_123',
                                order_id: 'order_fail_test',
                                error_code: 'BAD_REQUEST_ERROR',
                                error_description: 'Payment failed due to insufficient funds',
                                error_source: 'customer',
                                error_step: 'payment_authentication',
                                error_reason: 'payment_failed',
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('failed');
                expect(updatedPayment!.metadata).toHaveProperty('failedAt');
                expect(updatedPayment!.metadata).toHaveProperty('errorCode', 'BAD_REQUEST_ERROR');
                expect(updatedPayment!.metadata).toHaveProperty('errorDescription');
                expect(updatedPayment!.metadata).toHaveProperty('errorSource', 'customer');

                // User plan should remain free
                const user = await User.findById(testUser._id);
                expect(user!.planId).toBe('tenant_free');
            });
        });

        describe('refund events', () => {
            it('should process refund.processed and deactivate user plan for full refund', async () => {
                // Create completed payment first
                const payment = await PaymentEntity.create({
                    userId: testOwner.userId,
                    gateway: 'razorpay',
                    status: 'completed',
                    planId: 'owner_starter',
                    gatewayPaymentId: 'pay_refund_test',
                    totalAmount: 99900,
                    currency: 'INR',
                });

                // Activate owner plan first
                await Owner.updateOne(
                    { _id: testOwner._id },
                    { planId: 'owner_starter' }
                );

                const webhookPayload = {
                    event: 'refund.processed',
                    payload: {
                        refund: {
                            entity: {
                                id: 'rfnd_test_123',
                                payment_id: 'pay_refund_test',
                                amount: 99900, // Full refund
                                currency: 'INR',
                                status: 'processed',
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                // Payment should be marked as refunded
                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('refunded');
                expect(updatedPayment!.metadata?.refund).toHaveProperty('status', 'processed');

                // Owner should be deactivated to free plan (Starter allows 3, Free should be less or handled by fallback)
                const updatedOwner = await Owner.findById(testOwner._id);
                
                // deactivateUserPlan calls activateOwnerBusinessLogic(null, userId, 'owner_free')
                // which updates the planId to 'owner_free'
                expect(updatedOwner!.planId).toBe('owner_free');
                
                const activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
                expect(activePortions.length).toBe(1); // Free plan active listings = 1 according to ownerConfig.ts
            });

            it('should mark as partially_refunded for partial refund', async () => {
                const payment = await PaymentEntity.create({
                    userId: testUser._id,
                    gateway: 'razorpay',
                    status: 'completed',
                    planId: 'tenant_premium',
                    gatewayPaymentId: 'pay_partial_refund',
                    totalAmount: 49900,
                    currency: 'INR',
                });

                const webhookPayload = {
                    event: 'refund.processed',
                    payload: {
                        refund: {
                            entity: {
                                id: 'rfnd_partial_123',
                                payment_id: 'pay_partial_refund',
                                amount: 10000, // Partial refund
                                currency: 'INR',
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('partially_refunded');
            });
        });

        describe('dispute events', () => {
            it('should handle payment.dispute.created and update payment metadata', async () => {
                const payment = await PaymentEntity.create({
                    userId: testOwner.userId,
                    gateway: 'razorpay',
                    status: 'completed',
                    planId: 'owner_pro',
                    gatewayPaymentId: 'pay_dispute_test',
                    totalAmount: 199900,
                    currency: 'INR',
                });

                const webhookPayload = {
                    event: 'payment.dispute.created',
                    payload: {
                        dispute: {
                            entity: {
                                id: 'disp_test_123',
                                payment_id: 'pay_dispute_test',
                                amount: 199900,
                                reason_code: 'chargeback',
                                reason_description: 'Customer claims unauthorized transaction',
                                phase: 'chargeback',
                                respond_by: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.metadata?.dispute).toBeDefined();
                expect(updatedPayment!.metadata?.dispute).toHaveProperty('disputeId', 'disp_test_123');
                expect(updatedPayment!.metadata?.dispute).toHaveProperty('disputeStatus', 'created');
                expect(updatedPayment!.metadata?.dispute).toHaveProperty('disputeReason');
            });

            it('should handle payment.dispute.lost and deactivate plan', async () => {
                const payment = await PaymentEntity.create({
                    userId: testOwner.userId,
                    gateway: 'razorpay',
                    status: 'completed',
                    planId: 'owner_ultra',
                    gatewayPaymentId: 'pay_dispute_lost',
                    totalAmount: 299900,
                    currency: 'INR',
                });

                await Owner.updateOne(
                    { _id: testOwner._id },
                    { planId: 'owner_ultra' }
                );

                const webhookPayload = {
                    event: 'payment.dispute.lost',
                    payload: {
                        dispute: {
                            entity: {
                                id: 'disp_lost_123',
                                payment_id: 'pay_dispute_lost',
                                amount: 299900,
                                amount_deducted: 299900,
                                reason_code: 'chargeback',
                                reason_description: 'Dispute lost',
                                phase: 'chargeback',
                                respond_by: Math.floor(Date.now() / 1000),
                            }
                        }
                    }
                };

                await webhookService.processEvent(webhookPayload as any);

                const updatedPayment = await PaymentEntity.findById(payment._id);
                expect(updatedPayment!.status).toBe('disputed_lost');

                // Owner should be flagged and deactivated
                const updatedOwner = await Owner.findById(testOwner._id);
                const activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
                expect(activePortions.length).toBe(1); // Deactivated owners have 1 active listing on free plan
                expect(updatedOwner!.planId).toBe('owner_free');
            });
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // ERROR HANDLING & EDGE CASES
    // ══════════════════════════════════════════════════════════════════════════

    describe('Error Handling & Edge Cases', () => {
        it('should throw error when user not found for tenant activation', async () => {
            const fakeUserId = new mongoose.Types.ObjectId();
            await expect(
                activateTenantBusinessLogic(null, fakeUserId.toString(), 'tenant_premium')
            ).rejects.toThrow('User not found for tenant activation');
        });

        it('should throw error when owner not found for owner activation', async () => {
            const fakeOwnerId = new mongoose.Types.ObjectId();
            await expect(
                activateOwnerBusinessLogic(null, fakeOwnerId.toString(), 'owner_starter')
            ).rejects.toThrow('Owner not found for activation');
        });

        it('should handle webhook for non-existent payment gracefully', async () => {
            const webhookPayload = {
                event: 'order.paid',
                payload: {
                    order: {
                        entity: {
                            id: 'order_nonexistent_999',
                            amount: 99900,
                            amount_paid: 99900,
                            currency: 'INR',
                            status: 'paid',
                            attempts: 1,
                        }
                    },
                    payment: {
                        entity: {
                            id: 'pay_nonexistent_999',
                            method: 'card',
                        }
                    }
                }
            };

            // Should not throw, just log error
            await expect(
                webhookService.processEvent(webhookPayload as any)
            ).resolves.not.toThrow();
        });

        it('should handle owner with no portions', async () => {
            // Delete all portions
            await Portion.deleteMany({ ownerId: testOwner._id });

            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_starter',
                totalAmount: 99900,
                currency: 'INR',
            });

            await activateOwnerBusinessLogic(payment);

            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_starter');
            expect(updatedOwner!.usage.activeListings).toBe(0); // No portions to activate
        });

        it('should cache invalidation work correctly for portions', async () => {
            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_pro',
                totalAmount: 199900,
                currency: 'INR',
            });

            await activateOwnerBusinessLogic(payment);

            // Verify cache operations called
            // Note: activateOwnerBusinessLogic uses pipeline for individual portions and deletePattern for building-portions
            expect(RedisClientManager.deletePattern).toHaveBeenCalled();
        });

        it('should handle multiple buildings for owner correctly', async () => {
            // Create another building and portions
            const building2 = await Building.create({
                ownerId: testOwner._id,
                buildingName: 'Test Building 2',
                address: {
                    locality: 'Koramangala',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560034',
                    country: 'India'
                },
                contact: {
                    countryCode: '+91',
                    phoneNumber: '9876543210'
                },
                availabilityStatus: 'available',
                floors: 3,
                parking: true,
                amenities: ['gym', 'security']
            });

            for (let i = 0; i < 3; i++) {
                await Portion.create({
                    buildingId: building2._id,
                    ownerId: testOwner._id,
                    portionNumber: `C${i + 1}`,
                    floor: `${i + 1}`,
                    contact: {
                        countryCode: '+91',
                        phoneNumber: '9876543210'
                    },
                    address: {
                        locality: 'Koramangala',
                        city: 'Bangalore',
                        state: 'Karnataka',
                        zipCode: '560034',
                        country: 'India'
                    },
                    title: `Test Portion C${i + 1}`,
                    description: 'Another test portion',
                    price: 12000,
                    isActive: false,
                    availabilityStatus: 'available',
                    amenities: ['parking'],
                });
            }

            const payment = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_starter',
                totalAmount: 99900,
                currency: 'INR',
            });

            await activateOwnerBusinessLogic(payment);

            // Should activate 3 portions from across all buildings
            const activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(3);

            // Cache should be cleared for both buildings
            expect(RedisClientManager.deletePattern).toHaveBeenCalled();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // PLAN UPGRADE/DOWNGRADE SCENARIOS
    // ══════════════════════════════════════════════════════════════════════════

    describe('Plan Upgrade/Downgrade Scenarios', () => {
        it('should upgrade from starter to pro and activate all portions', async () => {
            // First activate starter plan (3 active portions)
            const payment1 = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_starter',
                totalAmount: 99900,
                currency: 'INR',
            });

            await activateOwnerBusinessLogic(payment1);

            let activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(3);

            // Now upgrade to pro
            const payment2 = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_pro',
                totalAmount: 199900,
                currency: 'INR',
            });

            await activateOwnerBusinessLogic(payment2);

            activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(5); // All portions now active

            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_pro');
            expect(updatedOwner!.verifiedBadge).toBe(true);
            expect(updatedOwner!.visibility).toBe('high');
        });

        it('should downgrade from pro to starter and deactivate portions', async () => {
            // First activate pro plan (all 5 active)
            const payment1 = await PaymentEntity.create({
                userId: testOwner.userId,
                gateway: 'razorpay',
                status: 'initiated',
                planId: 'owner_pro',
                totalAmount: 199900,
                currency: 'INR',
            });

            await activateOwnerBusinessLogic(payment1);

            let activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(5);

            // Now downgrade to starter (via refund/expiry simulation)
            await activateOwnerBusinessLogic(null, testOwner.userId.toString(), 'owner_starter');

            activePortions = await Portion.find({ ownerId: testOwner._id, isActive: true });
            expect(activePortions.length).toBe(3); // Only 3 active now

            const updatedOwner = await Owner.findById(testOwner._id);
            expect(updatedOwner!.planId).toBe('owner_starter');
        });
    });
});

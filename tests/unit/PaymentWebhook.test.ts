
import { Request, Response } from 'express';
import { dodoWebhookHandler } from '../../src/payments/dodo_webhooks';
import { dodosession } from '../../src/payments/dodo_payments_strategy';
import { PaymentEntity } from '../../src/payments/payments.models';
import { User } from '../../src/models/user.model';
import { Owner } from '../../src/models/owner.model';
import { Portion } from '../../src/models/portion.model';
import { Notification } from '../../src/models/notification.model';
import { sendPushNotification } from '../../src/utils/push_notifications';
import { RedisClientManager } from '../../src/cache/RedisClientManager';

// Mock dodosession
jest.mock('../../src/payments/dodo_payments_strategy', () => ({
    dodosession: {
        webhooks: {
            unwrap: jest.fn(),
        },
    },
}));

// Mock models
jest.mock('../../src/payments/payments.models');
jest.mock('../../src/models/user.model');
jest.mock('../../src/models/owner.model');
jest.mock('../../src/models/portion.model');
jest.mock('../../src/models/notification.model', () => ({
    Notification: {
        createNotification: jest.fn(),
    },
}));

// Mock utils
jest.mock('../../src/utils/push_notifications');
jest.mock('../../src/cache/RedisClientManager', () => ({
    RedisClientManager: {
        delete: jest.fn(),
        getInstance: jest.fn(),
        deletePattern: jest.fn(),
    },
}));

describe('Dodo Webhook Handler - Strict Status Checks', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonSpy: jest.Mock;
    let sendSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: Buffer.from('{}'),
            headers: {
                'webhook-id': 'test-id',
                'webhook-signature': 'test-sig',
                'webhook-timestamp': 'test-ts',
            },
        };
        sendSpy = jest.fn();
        statusSpy = jest.fn().mockReturnValue({ send: sendSpy });
        mockRes = {
            status: statusSpy,
        };
        (Portion.find as jest.Mock).mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
        });
    });

    const mockUnwrap = (type: string, status: string, planId: string, userId: string = 'user123') => {
        (dodosession.webhooks.unwrap as jest.Mock).mockReturnValue({
            type,
            data: {
                status,
                payment_id: 'pay123',
                subscription_id: 'sub123',
                metadata: {
                    internal_payment_id: 'payment123',
                    planId,
                },
                customer: {
                    customer_id: 'cust123',
                },
            },
        });
    };

    it('should NOT activate business logic for tenant if status is failed', async () => {
        mockUnwrap('subscription.updated', 'failed', 'tenant_premium');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'user123',
            planId: 'tenant_premium',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(200);
    });

    it('should activate business logic for tenant if status is active', async () => {
        mockUnwrap('subscription.active', 'active', 'tenant_premium');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            _id: 'payment123',
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: 'user123' },
            expect.objectContaining({ planId: 'tenant_premium' })
        );
        expect(statusSpy).toHaveBeenCalledWith(200);
    });

    it('should NOT activate business logic for owner if status is failed', async () => {
        mockUnwrap('subscription.updated', 'failed', 'owner_pro');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'ownerUser123',
            planId: 'owner_pro',
        });
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(Owner.updateOne).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(200);
    });

    it('should activate business logic for owner if status is active', async () => {
        mockUnwrap('subscription.active', 'active', 'owner_pro');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'ownerUser123',
            planId: 'owner_pro',
        });
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'ownerUser123',
            deviceToken: 'token123',
        });
        (RedisClientManager.getInstance as jest.Mock).mockReturnValue({
            pipeline: jest.fn().mockReturnValue({
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            }),
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(Owner.updateOne).toHaveBeenCalledWith(
            { _id: 'owner123' },
            expect.objectContaining({ planId: 'owner_pro' })
        );
        expect(statusSpy).toHaveBeenCalledWith(200);
    });

    it('should downgrade to free plan on subscription.expired', async () => {
        mockUnwrap('subscription.expired', 'expired', 'tenant_premium');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
            subscriptionId: 'sub123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: 'user123' },
            expect.objectContaining({ planId: 'tenant_free' })
        );
        expect(sendPushNotification).toHaveBeenCalledWith(
            'token123',
            'Subscription Expired',
            expect.any(String)
        );
    });

    it('should only send notification for payment.failed and NOT activate logic', async () => {
        mockUnwrap('payment.failed', 'failed', 'tenant_premium');
        (PaymentEntity.findByIdAndUpdate as jest.Mock).mockResolvedValue({
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).not.toHaveBeenCalled();
        expect(sendPushNotification).toHaveBeenCalledWith(
            'token123',
            'Payment Failed ❌',
            expect.any(String)
        );
    });

    it('should activate logic for tenant on subscription.renewed', async () => {
        mockUnwrap('subscription.renewed', 'active', 'tenant_premium');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: 'user123' },
            expect.objectContaining({ planId: 'tenant_premium' })
        );
    });

    it('should activate logic for owner on subscription.plan_changed', async () => {
        mockUnwrap('subscription.plan_changed', 'active', 'owner_pro');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'ownerUser123',
            planId: 'owner_pro',
        });
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'ownerUser123',
            deviceToken: 'token123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(Owner.updateOne).toHaveBeenCalledWith(
            { _id: 'owner123' },
            expect.objectContaining({ planId: 'owner_pro' })
        );
    });

    it('should downgrade logic for owner on subscription.failed', async () => {
        mockUnwrap('subscription.failed', 'failed', 'owner_pro');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'ownerUser123',
            planId: 'owner_pro',
        });
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
            subscriptionId: 'sub123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(Owner.updateOne).toHaveBeenCalledWith(
            { _id: 'owner123' },
            expect.objectContaining({ planId: 'owner_free' })
        );
    });

    it('should downgrade logic on refund.succeeded', async () => {
        (dodosession.webhooks.unwrap as jest.Mock).mockReturnValue({
            type: 'refund.succeeded',
            data: {
                payment_id: 'pay123',
                metadata: { internal_payment_id: 'payment123' }
            },
        });
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            _id: 'payment123',
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: 'user123' },
            expect.objectContaining({ planId: 'tenant_free' })
        );
    });

    it('should deactivate extra listings when owner downgrades to Starter plan (limit 3)', async () => {
        // Mock downgrade from Pro/Ultra (-1) to Starter (3)
        mockUnwrap('subscription.updated', 'active', 'owner_starter');
        
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'ownerUser123',
            planId: 'owner_starter',
        });
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'ownerUser123',
            deviceToken: 'token123',
        });

        // Mock 5 portions
        const mockPortions = [
            { _id: 'p1', buildingId: 'b1', title: 'P1' },
            { _id: 'p2', buildingId: 'b1', title: 'P2' },
            { _id: 'p3', buildingId: 'b1', title: 'P3' },
            { _id: 'p4', buildingId: 'b1', title: 'P4' },
            { _id: 'p5', buildingId: 'b1', title: 'P5' },
        ];
        (Portion.find as jest.Mock).mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockPortions),
        });

        const pipelineMock = {
            del: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        };
        (RedisClientManager.getInstance as jest.Mock).mockReturnValue({
            pipeline: jest.fn().mockReturnValue(pipelineMock),
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        // Verification: Check bulkWrite logic
        // First 3 should be true, next 2 should be false
        expect(Portion.bulkWrite).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ updateOne: { filter: { _id: 'p1' }, update: { isActive: true } } }),
            expect.objectContaining({ updateOne: { filter: { _id: 'p2' }, update: { isActive: true } } }),
            expect.objectContaining({ updateOne: { filter: { _id: 'p3' }, update: { isActive: true } } }),
            expect.objectContaining({ updateOne: { filter: { _id: 'p4' }, update: { isActive: false } } }),
            expect.objectContaining({ updateOne: { filter: { _id: 'p5' }, update: { isActive: false } } }),
        ]));

        // Cache invalidation should happen for portions and buildings
        expect(pipelineMock.del).toHaveBeenCalledTimes(5);
        expect(RedisClientManager.deletePattern).toHaveBeenCalledWith('building-portions:b1:*');
    });

    it('should stay functional even if push notifications fail', async () => {
        mockUnwrap('subscription.active', 'active', 'tenant_premium');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            _id: 'payment123',
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
        });

        // Mock push notification failure
        (sendPushNotification as jest.Mock).mockRejectedValue(new Error('Push Failed'));

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        // Business logic should STILL execute (User.updateOne)
        expect(User.updateOne).toHaveBeenCalled();
        // Return 200 OK
        expect(statusSpy).toHaveBeenCalledWith(200);
        expect(sendSpy).toHaveBeenCalledWith('OK');
    });

    it('should correctly invalidate caches for multiple buildings', async () => {
        mockUnwrap('subscription.active', 'active', 'owner_pro');
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'ownerUser123',
            planId: 'owner_pro',
        });
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
        });
        (User.findById as jest.Mock).mockResolvedValue({ _id: 'ownerUser123', deviceToken: 't' });

        const mockPortions = [
            { _id: 'p1', buildingId: 'building-A', title: 'PA' },
            { _id: 'p2', buildingId: 'building-B', title: 'PB' },
        ];
        (Portion.find as jest.Mock).mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockPortions),
        });

        (RedisClientManager.getInstance as jest.Mock).mockReturnValue({
            pipeline: jest.fn().mockReturnValue({
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            }),
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(RedisClientManager.deletePattern).toHaveBeenCalledWith('building-portions:building-A:*');
        expect(RedisClientManager.deletePattern).toHaveBeenCalledWith('building-portions:building-B:*');
    });

    it('should return 500 if unwrap fails (invalid signature)', async () => {
        (dodosession.webhooks.unwrap as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(sendSpy).toHaveBeenCalledWith('Webhook error');
    });

    it('should NOT downgrade owner if an OLD subscription expires while a NEW one is active', async () => {
        // User is ALREADY on a new plan in the DB
        (Owner.findById as jest.Mock).mockResolvedValue({
            _id: 'owner123',
            userId: 'ownerUser123',
            subscriptionId: 'NEW_SUB_ID' // Current active sub
        });
        (PaymentEntity.findById as jest.Mock).mockResolvedValue({
            userId: 'owner123',
            planId: 'owner_pro',
        });

        // Webhook for OLD sub
        (dodosession.webhooks.unwrap as jest.Mock).mockReturnValue({
            type: 'subscription.expired',
            data: {
                subscription_id: 'OLD_SUB_ID',
                metadata: { planId: 'owner_starter' }
            },
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        // Should NOT call activation logic (which would set them to free)
        expect(Owner.updateOne).not.toHaveBeenCalledWith(
            { _id: 'owner123' },
            expect.objectContaining({ planId: 'owner_free' })
        );
    });

    it('should downgrade logic on dispute.opened', async () => {
        (dodosession.webhooks.unwrap as jest.Mock).mockReturnValue({
            type: 'dispute.opened',
            data: {
                payment_id: 'pay123',
            },
        });
        (PaymentEntity.findOne as jest.Mock).mockResolvedValue({
            _id: 'payment123',
            userId: 'user123',
            planId: 'tenant_premium',
        });
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'user123',
            deviceToken: 'token123',
        });

        await dodoWebhookHandler(mockReq as Request, mockRes as Response);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: 'user123' },
            expect.objectContaining({ planId: 'tenant_free' })
        );
    });
});

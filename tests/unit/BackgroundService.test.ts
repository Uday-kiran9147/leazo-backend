const { BackgroundService } = jest.requireActual('../../src/utils/BackgroundService');
import { UserActivity } from '../../src/models/admin/userActivity';
import { DailyActiveUser, MonthlyActiveUser, YearlyActiveUser } from '../../src/models/admin/activity';
import { sendPushNotification } from '../../src/utils/push_notifications';

jest.mock('../../src/models/admin/userActivity');
jest.mock('../../src/models/admin/activity');
jest.mock('../../src/utils/push_notifications');

describe('BackgroundService', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        // Reset private static properties for tests
        (BackgroundService as any).activityBatch = [];
        if ((BackgroundService as any).timer) {
            clearTimeout((BackgroundService as any).timer);
            (BackgroundService as any).timer = null;
        }
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should queue activity and process after timeout', async () => {
        const userId = 'user123';
        BackgroundService.trackActivity(userId, 'login');

        expect((BackgroundService as any).activityBatch.length).toBe(1);
        
        // Fast-forward 5 seconds
        jest.advanceTimersByTime(5000);

        // We need to wait for any promises to resolve
        await Promise.resolve();

        expect(UserActivity.insertMany).toHaveBeenCalled();
        expect(DailyActiveUser.updateOne).toHaveBeenCalled();
        expect((BackgroundService as any).activityBatch.length).toBe(0);
    });

    it('should process batch immediately when BATCH_SIZE is reached', async () => {
        const userId = 'user123';
        const BATCH_SIZE = 50;

        for (let i = 0; i < BATCH_SIZE; i++) {
            BackgroundService.trackActivity(userId, 'property_view');
        }

        expect(UserActivity.insertMany).toHaveBeenCalled();
        expect((BackgroundService as any).activityBatch.length).toBe(0);
    });

    it('should send notification without blocking', async () => {
        const token = 'token123';
        const title = 'Test';
        const body = 'Hello';

        (sendPushNotification as jest.Mock).mockResolvedValue(true);

        await BackgroundService.sendNotification(token, title, body);

        expect(sendPushNotification).toHaveBeenCalledWith(token, title, body);
    });
});

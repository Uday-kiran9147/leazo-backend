import { sendPushNotification } from './push_notifications';
import { logger } from './logger';
import { UserActivity } from '../models/admin/userActivity';
import { DailyActiveUser, MonthlyActiveUser, YearlyActiveUser } from '../models/admin/activity';

export class BackgroundService {
    private static activityBatch: any[] = [];
    private static BATCH_SIZE = 50;
    private static BATCH_TIMEOUT = 5000; // 5 seconds
    private static timer: NodeJS.Timeout | null = null;
    private static processingPromise: Promise<void> | null = null;

    /**
     * Sends a push notification in the background without blocking the request.
     */
    static async sendNotification(token: string, title: string, body: string) {
        // We don't await this inside the controller/service that calls it
        sendPushNotification(token, title, body).catch(err => {
            logger.error('Background Notification Error', err);
        });
    }

    /**
     * Tracks user activity and batches it for efficiency.
     */
    static trackActivity(userId: string, activityType: string, deviceInfo?: string, ipAddress?: string) {
        this.activityBatch.push({
            userId,
            activityType,
            deviceInfo,
            ipAddress,
            timestamp: new Date()
        });

        if (this.activityBatch.length >= this.BATCH_SIZE) {
            this.processActivityBatch();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.processActivityBatch(), this.BATCH_TIMEOUT);
        }
    }

    private static async processActivityBatch() {
        if (this.processingPromise) {
            await this.processingPromise;
        }

        this.processingPromise = this._internalProcessBatch();
        try {
            await this.processingPromise;
        } finally {
            this.processingPromise = null;
        }
    }

    private static async _internalProcessBatch() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.activityBatch.length === 0) return;

        const batch = [...this.activityBatch];
        this.activityBatch = [];

        try {
            logger.debug(`Processing batch of ${batch.length} activities...`);
            
            // 1. Bulk insert user activities
            await UserActivity.insertMany(batch.map(a => ({
                userId: a.userId,
                activityType: a.activityType,
                deviceInfo: a.deviceInfo,
                ipAddress: a.ipAddress,
                createdAt: a.timestamp
            })));

            // 2. Update active user stats (Bulk operations would be better here, but for now simple updates)
            for (const activity of batch) {
                const today = new Date(activity.timestamp);
                today.setHours(0, 0, 0, 0);
                const year = today.getFullYear();
                const month = today.getMonth() + 1;

                // These are still sequential, ideally we use bulkWrite
                await Promise.all([
                    DailyActiveUser.updateOne(
                        { userId: activity.userId, date: today },
                        { $setOnInsert: { userId: activity.userId, date: today } },
                        { upsert: true }
                    ),
                    MonthlyActiveUser.updateOne(
                        { userId: activity.userId, year, month },
                        { $setOnInsert: { userId: activity.userId, year, month } },
                        { upsert: true }
                    ),
                    YearlyActiveUser.updateOne(
                        { userId: activity.userId, year },
                        { $setOnInsert: { userId: activity.userId, year } },
                        { upsert: true }
                    )
                ]);
            }
        } catch (error) {
            logger.error('Failed to process activity batch', error);
            // In a real system, we might want to retry or log to a dead letter queue
        }
    }

    /**
     * Flushes the current batch immediately and waits for it to finish.
     */
    static async flush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        await this.processActivityBatch();
    }

    /**
     * Stops the background service, clearing pending timers and batches.
     * Useful for clean test teardown.
     */
    static async stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.activityBatch = [];
        if (this.processingPromise) {
            await this.processingPromise;
        }
    }
}

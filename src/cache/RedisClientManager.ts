import { Redis } from '@upstash/redis';

export class RedisClientManager {
    private static instance: Redis;

    // Private constructor to prevent instantiation
    private constructor() { }

    // Singleton instance getter
    static getInstance(): Redis {
        if (!RedisClientManager.instance) {
            RedisClientManager.instance = new Redis({
                url: process.env.REDIS_URL!,
                token: process.env.REDIS_SECRET!
            });
        }
        return RedisClientManager.instance;
    }

    // Set a value in Redis with an optional expiration time (in seconds)
    static async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
        try {
            const redis = RedisClientManager.getInstance();
            const jsonValue:any = JSON.stringify(value);
            if (expirationInSeconds) {
                await redis.set(key, jsonValue, { ex: expirationInSeconds });
            } else {
                await redis.set(key, jsonValue);
            }
            //console.log(`Set key: ${key}`);
        } catch (error) {
            console.error(`Failed to set key ${key}:`, error);
        }
    }

    // Get a value from Redis by key
    static async get(key: string): Promise<any> {
        try {
            const redis = RedisClientManager.getInstance();
            const value = await redis.get(key);
            //console.log(`Get key: ${key}`);
            return value;
        } catch (error) {
            console.error(`Failed to get key ${key}:`, error);
            return null;
        }
    }

    // Delete a key from Redis
    static async delete(key: string): Promise<void> {
        try {
            const redis = RedisClientManager.getInstance();
            await redis.del(key);
            //console.log(`Deleted key: ${key}`);
        } catch (error) {
            console.error(`Failed to delete key ${key}:`, error);
        }
    }

    // Check if a key exists in Redis
    static async exists(key: string): Promise<boolean> {
        try {
            const redis = RedisClientManager.getInstance();
            const result = await redis.exists(key);
            //console.log(`Checked existence of key: ${key}`);
            return result === 1;
        } catch (error) {
            console.error(`Failed to check existence for key ${key}:`, error);
            return false;
        }
    }
}

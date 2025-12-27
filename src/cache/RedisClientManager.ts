import { Redis } from '@upstash/redis';

export class RedisClientManager {
    private static instance: Redis | null = null;

    // Private constructor to prevent instantiation
    private constructor() { }

    private static isProduction(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    // Singleton instance getter
    static getInstance(): Redis | null {
        if (!this.isProduction()) {
            return null;
        }

        if (!RedisClientManager.instance) {
            RedisClientManager.instance = new Redis({
                url: process.env.REDIS_URL!,
                token: process.env.REDIS_SECRET!
            });
        }
        return RedisClientManager.instance;
    }

    static async deletePattern(pattern: string): Promise<void> {
        if (!this.isProduction()) return;
        try {
            const redis = RedisClientManager.getInstance();
            if (!redis) return;
            const keys = await redis.keys(pattern);

            if (keys.length === 0) return;

            await Promise.all(keys.map((key) =>{
                console.log(`[Redis] DELETE PATTERN key: ${key}`);
                return redis.del(key);
            }));
        } catch (error) {
            console.error(`[Redis] DELETE PATTERN failed: ${pattern}`, error);
        }
    }

    // Set a value in Redis with an optional expiration time (in seconds)
    static async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
        if (!this.isProduction()) return;
        try {
            const redis = RedisClientManager.getInstance();
            if (!redis) return;
            const jsonValue:any = JSON.stringify(value);
            expirationInSeconds = 60; // default 1 minute
            if (expirationInSeconds) {
                await redis.set(key, jsonValue, { ex: expirationInSeconds });
            } else {
                await redis.set(key, jsonValue);
            }
            console.log(`[Redis] SET key: ${key}`);
        } catch (error) {
            console.error(`Failed to set key ${key}:`, error);
        }
    }

    // Get a value from Redis by key
    static async get(key: string): Promise<any> {
        if (!this.isProduction()) return null;
        try {
            const redis = RedisClientManager.getInstance();
            if (!redis) return null;
            const value = await redis.get(key);
            if (value) {
                console.log(`[Redis] HIT key: ${key}`);
            } else {
                console.log(`[Redis] MISS key: ${key}`);
            }
            return value;
        } catch (error) {
            console.error(`Failed to get key ${key}:`, error);
            return null;
        }
    }

    // Delete a key from Redis
    static async delete(key: string): Promise<void> {
        if (!this.isProduction()) return;
        try {
            const redis = RedisClientManager.getInstance();
            if (!redis) return;
            await redis.del(key);
            console.log(`[Redis] DELETE key: ${key}`);
        } catch (error) {
            console.error(`Failed to delete key ${key}:`, error);
        }
    }

    // Check if a key exists in Redis
    static async exists(key: string): Promise<boolean> {
        if (!this.isProduction()) return false;
        try {
            const redis = RedisClientManager.getInstance();
            if (!redis) return false;
            const result = await redis.exists(key);
            console.log(`[Redis] EXISTS key: ${key} -> ${result === 1}`);
            return result === 1;
        } catch (error) {
            console.error(`Failed to check existence for key ${key}:`, error);
            return false;
        }
    }

    // Increment a value in Redis
    static async incr(key: string): Promise<number> {
        if (!this.isProduction()) return 0;
        try {
            const redis = RedisClientManager.getInstance();
            if (!redis) return 0;
            const newValue = await redis.incr(key);
            console.log(`[Redis] INCR key: ${key} -> ${newValue}`);
            return newValue;
        } catch (error) {
            console.error(`Failed to increment key ${key}:`, error);
            return 0;
        }
    }
}

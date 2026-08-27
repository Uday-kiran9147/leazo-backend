import { Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../interfaces/refresh_token_repository.interface';
import { RedisClientManager } from '../../../cache/RedisClientManager';

/**
 * Refresh Token Repository implementing IRefreshTokenRepository with Redis + In-Memory Fallback.
 * Repository Pattern: Decouples persistent caching storage mechanisms from authentication service logic.
 */
@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  private static memoryStore = new Map<string, { token: string; expiresAt: number }>();

  /**
   * Stores a hashed refresh token in Redis (or in-memory fallback) with key `refresh:${userId}`.
   * @param userId User ObjectId string.
   * @param hashedToken Hashed refresh token.
   * @param ttlSeconds TTL duration in seconds.
   */
  async store(userId: string, hashedToken: string, ttlSeconds: number): Promise<void> {
    await RedisClientManager.set(`refresh:${userId}`, hashedToken, ttlSeconds);
    
    // Always store in memory fallback as well (for unconfigured or offline Redis environments)
    RefreshTokenRepository.memoryStore.set(userId, {
      token: hashedToken,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Finds stored refresh token from Redis or in-memory fallback.
   * @param userId User ObjectId string.
   * @returns Hashed refresh token string or null.
   */
  async find(userId: string): Promise<string | null> {
    const redisResult = await RedisClientManager.get(`refresh:${userId}`);
    if (redisResult) {
      return redisResult;
    }

    const memVal = RefreshTokenRepository.memoryStore.get(userId);
    if (memVal) {
      if (Date.now() > memVal.expiresAt) {
        RefreshTokenRepository.memoryStore.delete(userId);
        return null;
      }
      return memVal.token;
    }
    return null;
  }

  /**
   * Revokes stored refresh token for user.
   * @param userId User ObjectId string.
   */
  async revoke(userId: string): Promise<void> {
    await RedisClientManager.delete(`refresh:${userId}`);
    RefreshTokenRepository.memoryStore.delete(userId);
  }
}

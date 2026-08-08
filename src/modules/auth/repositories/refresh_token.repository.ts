import { Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../interfaces/refresh_token_repository.interface';
import { RedisClientManager } from '../../../cache/RedisClientManager';

/**
 * Refresh Token Repository implementing IRefreshTokenRepository using RedisClientManager.
 * Repository Pattern: Decouples persistent caching storage mechanisms from authentication service logic.
 */
@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  /**
   * Stores a hashed refresh token in Redis with key `refresh:${userId}`.
   * @param userId User ObjectId string.
   * @param hashedToken Hashed refresh token.
   * @param ttlSeconds TTL duration in seconds.
   */
  async store(userId: string, hashedToken: string, ttlSeconds: number): Promise<void> {
    await RedisClientManager.set(`refresh:${userId}`, hashedToken, ttlSeconds);
  }

  /**
   * Finds stored refresh token from Redis.
   * @param userId User ObjectId string.
   * @returns Hashed refresh token string or null.
   */
  async find(userId: string): Promise<string | null> {
    return RedisClientManager.get(`refresh:${userId}`);
  }

  /**
   * Revokes stored refresh token for user.
   * @param userId User ObjectId string.
   */
  async revoke(userId: string): Promise<void> {
    await RedisClientManager.delete(`refresh:${userId}`);
  }
}

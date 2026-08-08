/**
 * Injection token for IRefreshTokenRepository interface binding.
 */
export const REFRESH_TOKEN_REPOSITORY = 'IRefreshTokenRepository';

/**
 * Repository interface for refresh token persistent storage and revocation.
 * Adheres to Repository Pattern and Interface Segregation Principle (ISP).
 */
export interface IRefreshTokenRepository {
  /**
   * Stores a hashed refresh token for a user with TTL.
   * @param userId User ObjectId string.
   * @param hashedToken The hashed refresh token string.
   * @param ttlSeconds Expiry time in seconds.
   */
  store(userId: string, hashedToken: string, ttlSeconds: number): Promise<void>;

  /**
   * Finds stored hashed refresh token for a user.
   * @param userId User ObjectId string.
   * @returns Hashed token string or null if expired/not found.
   */
  find(userId: string): Promise<string | null>;

  /**
   * Revokes (deletes) refresh token for a user.
   * @param userId User ObjectId string.
   */
  revoke(userId: string): Promise<void>;
}

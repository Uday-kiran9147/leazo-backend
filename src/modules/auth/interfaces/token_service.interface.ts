/**
 * Injection token for ITokenService interface binding.
 */
export const TOKEN_SERVICE = 'ITokenService';

/**
 * Interface representing JWT Payload structure.
 */
export interface JwtPayload {
  // The unique identifier for the user, typically the MongoDB ObjectId as a string.
  sub: string;
  id?: string;
  _id?: string;
  email: string;
  role?: string;
  [key: string]: any;
}

/**
 * Interface defining contract for JWT token generation and verification.
 * Adheres to Dependency Inversion Principle (DIP) and Single Responsibility Principle (SRP).
 */
export interface ITokenService {
  /**
   * Generates a signed Access Token.
   * @param payload The payload to embed inside token.
   * @returns Promise resolving to JWT string.
   */
  generateAccessToken(payload: JwtPayload): Promise<string>;

  /**
   * Generates a signed Refresh Token.
   * @param payload The payload to embed inside token.
   * @returns Promise resolving to JWT string.
   */
  generateRefreshToken(payload: JwtPayload): Promise<string>;

  /**
   * Verifies an Access Token and extracts payload.
   * @param token The access token string.
   * @returns Promise resolving to decoded JwtPayload.
   */
  verifyAccessToken(token: string): Promise<JwtPayload>;

  /**
   * Verifies a Refresh Token and extracts payload.
   * @param token The refresh token string.
   * @returns Promise resolving to decoded JwtPayload.
   */
  verifyRefreshToken(token: string): Promise<JwtPayload>;
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { ITokenService, JwtPayload } from './interfaces/token_service.interface';
import { logger } from '../../utils/logger';

/**
 * Service implementing ITokenService for JWT operations.
 * Single Responsibility Principle (SRP): Focuses exclusively on token signing and verification.
 */
@Injectable()
export class TokenService implements ITokenService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Generates a signed Access Token using configured secret (defaults to 1 day expiry).
   * @param payload User identity payload.
   * @returns Signed JWT string.
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'secret';
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || process.env.JWT_EXPIRES_IN || '7d';
    logger.info(`Generating access token for user: ${payload.sub} (expiresIn: ${expiresIn})`);
    
    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  }

  /**
   * Generates a signed Refresh Token using configured secret (defaults to 7 days expiry).
   * @param payload User identity payload.
   * @returns Signed JWT string.
   */
  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret =
      this.config.get<string>('REFRESH_TOKEN_SECRET') ||
      process.env.REFRESH_TOKEN_SECRET ||
      this.config.get<string>('JWT_SECRET') ||
      'refresh_secret';
    const expiresIn = this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') || process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  }

  /**
   * Verifies an Access Token against JWT_SECRET.
   * @param token JWT string to verify.
   * @returns Decoded JwtPayload.
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const secret = this.config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'secret';
      return jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verifies a Refresh Token against REFRESH_TOKEN_SECRET.
   * @param token JWT string to verify.
   * @returns Decoded JwtPayload.
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const secret =
        this.config.get<string>('REFRESH_TOKEN_SECRET') ||
        process.env.REFRESH_TOKEN_SECRET ||
        this.config.get<string>('JWT_SECRET') ||
        'refresh_secret';

      logger.info(`Verifying refresh token with secret`);
      return jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
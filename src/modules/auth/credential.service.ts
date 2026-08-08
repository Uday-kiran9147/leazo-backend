import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ICredentialService } from './interfaces/credential_service.interface';

/**
 * Service implementing ICredentialService using bcrypt.
 * Single Responsibility Principle (SRP): Responsible solely for hashing and comparing credentials.
 */
@Injectable()
export class CredentialService implements ICredentialService {
  private readonly saltRounds = 10;

  /**
   * Hashes a plain text password using bcrypt salt rounds.
   * @param plain The raw password string.
   * @returns Hashed password string.
   */
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  /**
   * Compares plain text password against hashed password.
   * @param hash Stored hashed password.
   * @param plain Input raw password.
   * @returns True if password matches, false otherwise.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    if (!hash || !plain) return false;
    return bcrypt.compare(plain, hash);
  }
}
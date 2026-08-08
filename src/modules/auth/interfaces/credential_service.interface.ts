/**
 * Injection token for ICredentialService interface binding.
 */
export const CREDENTIAL_SERVICE = 'ICredentialService';

/**
 * Interface defining contract for credential hashing and verification.
 * Adheres to Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
 */
export interface ICredentialService {
  /**
   * Hashes a plain-text password using a secure hashing algorithm (e.g., bcrypt).
   * @param plain The plain text password to hash.
   * @returns Promise resolving to the hashed string.
   */
  hash(plain: string): Promise<string>;

  /**
   * Verifies a plain-text password against a hashed password.
   * @param hash The stored hash.
   * @param plain The plain text input.
   * @returns Promise resolving to boolean indicating match status.
   */
  verify(hash: string, plain: string): Promise<boolean>;
}

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CredentialService } from './credential.service';
import { TokenService } from './token.service';
import { RefreshTokenRepository } from './repositories/refresh_token.repository';
import { AuthStrategyFactory } from './interfaces/auth_strategy.factory';
import { TenantAuthStrategy, OwnerOtpAuthStrategy } from './interfaces/auth_strategy.interface';
import { CREDENTIAL_SERVICE } from './interfaces/credential_service.interface';
import { TOKEN_SERVICE } from './interfaces/token_service.interface';
import { REFRESH_TOKEN_REPOSITORY } from './interfaces/refresh_token_repository.interface';

/**
 * Authentication Module configuring providers, strategy factory, and interface bindings.
 *
 * Dependency Inversion Principle (DIP):
 * Binds abstract injection tokens (CREDENTIAL_SERVICE, TOKEN_SERVICE, REFRESH_TOKEN_REPOSITORY)
 * to concrete implementations (CredentialService, TokenService, RefreshTokenRepository).
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    CredentialService,
    TokenService,
    RefreshTokenRepository,
    TenantAuthStrategy,
    OwnerOtpAuthStrategy,
    AuthStrategyFactory,
    {
      provide: CREDENTIAL_SERVICE,
      useClass: CredentialService,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: TokenService,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: RefreshTokenRepository,
    },
  ],
  exports: [AuthService, TOKEN_SERVICE, CREDENTIAL_SERVICE, AuthStrategyFactory],
})
export class AuthModule {}

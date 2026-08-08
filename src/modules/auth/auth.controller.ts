import { Controller, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto } from './dto/auth.dto';

/**
 * Controller handling authentication endpoints for API clients.
 *
 * Single Responsibility Principle (SRP):
 * Handles HTTP route mapping, DTO binding/validation, and delegates execution directly to AuthService.
 */
@Controller(['api/auth', 'v1/api/auth'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint for registering a new user account (201 Created).
   * @param dto User registration parameters.
   */
  @Post('sign-up')
  async handleSignUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  /**
   * Endpoint for user login with optional strategy selection (200 OK).
   * @param dto Login credentials.
   * @param actorType Strategy target actor ('tenant' | 'owner').
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async handleLogin(
    @Body() dto: LoginDto,
    @Query('type') actorType?: 'tenant' | 'owner',
  ) {
    return this.authService.login(dto, actorType);
  }

  /**
   * Endpoint to request password reset OTP (200 OK).
   * @param dto Object containing user email.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async handleForgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Endpoint to reset password using OTP code (200 OK).
   * @param dto Reset credentials (email, OTP, new password).
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async handleResetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Endpoint to refresh access token using valid refresh token (200 OK).
   * @param dto Refresh token payload.
   */
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async handleRefreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  /**
   * Endpoint to log out user and invalidate refresh token (200 OK).
   * @param dto Refresh token payload.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async handleLogout(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }
}

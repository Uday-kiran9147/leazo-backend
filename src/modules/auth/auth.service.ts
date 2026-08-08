import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../models/user.model';
import sendEmail from '../../utils/mail';
import { logger } from '../../utils/logger';
import ApiResponse from '../../utils/api_response';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto } from './dto/auth.dto';
import { CREDENTIAL_SERVICE, ICredentialService } from './interfaces/credential_service.interface';
import { TOKEN_SERVICE, ITokenService, JwtPayload } from './interfaces/token_service.interface';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from './interfaces/refresh_token_repository.interface';
import { AuthStrategyFactory } from './interfaces/auth_strategy.factory';

/**
 * Authentication Service Façade.
 * Orchestrates user registration, authentication strategies, credential management,
 * token generation/refresh, and password recovery workflows.
 *
 * SOLID Principles:
 * - Single Responsibility Principle (SRP): Focuses exclusively on authentication business logic orchestration.
 * - Dependency Inversion Principle (DIP): Injects abstractions (ICredentialService, ITokenService, IRefreshTokenRepository) via NestJS DI tokens.
 * - Open/Closed Principle (OCP): Auth strategies are dynamically loaded via AuthStrategyFactory.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(CREDENTIAL_SERVICE) private readonly credentialService: ICredentialService,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly strategyFactory: AuthStrategyFactory,
  ) {}

  /**
   * Registers a new user account.
   * @param dto User registration parameters.
   * @returns ApiResponse containing created user document and authentication tokens.
   */
  async signUp(dto: SignUpDto) {
    const existingUser = await User.findOne({ email: dto.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await this.credentialService.hash(dto.password);

    const user = await User.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
    });

    const tokens = await this.issueTokens(user);
    return new ApiResponse(201, 'Account created successfully', { user, ...tokens });
  }

  /**
   * Authenticates user using Strategy Pattern based on actor type ('tenant' | 'owner').
   * @param dto User login credentials.
   * @param actorType Strategy target selector. Defaults to 'tenant'.
   * @returns ApiResponse containing user identity and tokens.
   */
  async login(dto: LoginDto, actorType: 'tenant' | 'owner' = 'tenant') {
    const strategy = this.strategyFactory.getStrategy(actorType);
    const user = await strategy.validate(dto);

    if (dto.deviceToken) {
      user.deviceToken = dto.deviceToken;
      await user.save();
    }

    if (user.trackActivity) {
      await user.trackActivity('login', dto.deviceInfo, dto.ipAddress);
    }

    const tokens = await this.issueTokens(user);
    return new ApiResponse(200, 'Login successful', { user, ...tokens });
  }

  /**
   * Initiates forgot password flow by generating a 6-digit OTP and mailing user.
   * @param dto Forgot password parameters containing user email.
   * @returns ApiResponse indicating status of OTP email dispatch.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await User.findOne({ email: dto.email });
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'Leazo Password Reset OTP',
        message: `Your Leazo password reset OTP is: ${otp}. It is valid for 10 minutes.`,
      });
      logger.info(`Password reset OTP generated and sent`, { email: user.email });
      return new ApiResponse(200, 'OTP sent to email', {});
    } catch (err: any) {
      logger.error(`Failed to send password reset email`, { email: user.email, error: err.message || err });
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new BadRequestException('Error sending email. Please try again later.');
    }
  }

  /**
   * Validates OTP and updates user password.
   * @param dto Reset password parameters including email, OTP, and new password.
   * @returns ApiResponse indicating password reset status.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await User.findOne({
      email: dto.email,
      resetPasswordToken: dto.otp,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid OTP or OTP has expired');
    }

    user.password = await this.credentialService.hash(dto.newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password reset successfully executed`, { email: dto.email });
    return new ApiResponse(200, 'Password reset successful', {});
  }

  /**
   * Refreshes access token after verifying the provided refresh token and Redis store state.
   * @param dto Object containing refresh token string.
   * @returns ApiResponse with new access token.
   */
  async refreshToken(dto: RefreshTokenDto) {
    const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    const userId = payload.sub || payload.id || payload._id;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const storedHashedToken = await this.refreshTokenRepo.find(userId);

    if (!storedHashedToken) {
      throw new UnauthorizedException('Refresh token is invalid or has been revoked');
    }

    const isValid = await this.credentialService.verify(storedHashedToken, dto.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token credential');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    const newAccessToken = await this.tokenService.generateAccessToken({
      sub: user._id.toString(),
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      role: user.role || 'User',
    });

    return new ApiResponse(200, 'Token refreshed successfully', { accessToken: newAccessToken });
  }

  /**
   * Logs out user by revoking their stored refresh token in Redis.
   * @param userId ObjectId string of user.
   * @returns ApiResponse confirming logout.
   */
  async logout(userId: string) {
    await this.refreshTokenRepo.revoke(userId);
    return new ApiResponse(200, 'Logged out successfully', {});
  }

  /**
   * Helper method to issue Access & Refresh token pair for authenticated user.
   * Stores hashed refresh token in repository.
   * @param user Mongoose User Document instance.
   * @returns Object with accessToken and refreshToken strings.
   */
  private async issueTokens(user: any) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      role: user.role || 'User',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(payload),
      this.tokenService.generateRefreshToken(payload),
    ]);

    const hashedToken = await this.credentialService.hash(refreshToken);
    // Store refresh token with 7-day TTL (7 * 24 * 60 * 60 seconds)
    await this.refreshTokenRepo.store(user._id.toString(), hashedToken, 7 * 24 * 60 * 60);

    return { token: accessToken, accessToken, refreshToken };
  }
}

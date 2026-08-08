import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for User Registration (Sign-Up).
 */
export class SignUpDto {
  @IsEmail({}, { message: 'Invalid email address format' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber!: string;
}

/**
 * Data Transfer Object for User Authentication (Login).
 */
export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address format' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  deviceToken?: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}

/**
 * Data Transfer Object for Forgot Password OTP Request.
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email address format' })
  email!: string;
}

/**
 * Data Transfer Object for Reset Password Submission.
 */
export class ResetPasswordDto {
  @IsEmail({}, { message: 'Invalid email address format' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP token is required' })
  otp!: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword!: string;
}

/**
 * Data Transfer Object for Refresh Token Request.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

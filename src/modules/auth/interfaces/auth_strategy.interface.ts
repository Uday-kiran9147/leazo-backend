import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LoginDto } from '../dto/auth.dto';
import { User } from '../../../models/user.model';
import { CREDENTIAL_SERVICE, ICredentialService } from './credential_service.interface';

/**
 * Strategy Pattern Interface for Authentication mechanisms.
 * Open/Closed Principle (OCP): New auth strategies (e.g. OAuth, OTP, Tenant) 
 * can be added without modifying existing consumer code.
 */
export interface IAuthStrategy {
  /**
   * Validates user credentials and returns the authenticated user entity.
   * @param credentials The login data transfer object.
   */
  validate(credentials: LoginDto): Promise<any>;
}

/**
 * Tenant / Email-Password Strategy Implementation.
 * Validates user credentials against stored email and password hash.
 */
@Injectable()
export class TenantAuthStrategy implements IAuthStrategy {
  constructor(
    @Inject(CREDENTIAL_SERVICE) private readonly credentialService: ICredentialService,
  ) {}

  async validate(dto: LoginDto): Promise<any> {
    const user = await User.findOne({ email: dto.email });
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isValid = await this.credentialService.verify(user.password, dto.password);
    if (!isValid) {
      throw new BadRequestException('Invalid email or password');
    }

    return user;
  }
}

/**
 * Owner / OTP Authentication Strategy Implementation.
 * Strategy for validating owners using OTP or phone credentials.
 */
@Injectable()
export class OwnerOtpAuthStrategy implements IAuthStrategy {
  async validate(dto: LoginDto): Promise<any> {
    if (!dto.email && !dto.phoneNumber) {
      throw new UnauthorizedException('Phone number or email required for OTP authentication');
    }
    const query = dto.email ? { email: dto.email } : { phoneNumber: dto.phoneNumber };
    const user = await User.findOne(query);
    if (!user) {
      throw new UnauthorizedException('User not found for provided credentials');
    }
    return user;
  }
}
import { Injectable, BadRequestException } from '@nestjs/common';
import { IAuthStrategy, TenantAuthStrategy, OwnerOtpAuthStrategy } from './auth_strategy.interface';

/**
 * Factory Pattern implementation for resolving authentication strategies.
 * Encapsulates the strategy selection logic based on actor type, ensuring high cohesion and low coupling.
 */
@Injectable()
export class AuthStrategyFactory {
  constructor(
    private readonly tenantStrategy: TenantAuthStrategy,
    private readonly ownerStrategy: OwnerOtpAuthStrategy,
  ) {}

  /**
   * Resolves the appropriate strategy based on the actor type.
   * @param actorType The target user type ('tenant' | 'owner'). Defaults to 'tenant'.
   * @returns IAuthStrategy instance handling the authentication flow.
   */
  getStrategy(actorType: 'tenant' | 'owner' = 'tenant'): IAuthStrategy {
    const strategyMap: Record<string, IAuthStrategy> = {
      tenant: this.tenantStrategy,
      owner: this.ownerStrategy,
    };

    const strategy = strategyMap[actorType];
    if (!strategy) {
      throw new BadRequestException(`Unsupported authentication strategy for actor type: ${actorType}`);
    }
    return strategy;
  }
}
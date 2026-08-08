import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.body?.user || request.user;

    if (user && (user.role === 'Admin' || user.role === 'Moderator')) {
      return true;
    }
    throw new ForbiddenException('Access denied. Admins and Moderators only.');
  }
}

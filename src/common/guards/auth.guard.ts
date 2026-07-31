import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { User } from '../../models/user.model';
import { logger } from '../../utils/logger';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token = request.headers.authorization;

    if (!token) {
      throw new BadRequestException('Please provide token');
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    const secretKey = process.env.JWT_SECRET as string;
    if (!secretKey) {
      throw new BadRequestException('Please provide secret key');
    }

    try {
      const decoded = jwt.verify(token, secretKey) as jwt.JwtPayload;
      logger.debug('Decoded JWT Token', { decoded });
      const userId = decoded._id;

      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!request.body) {
        request.body = {};
      }
      request.body.user = user;
      request.user = user;
      return true;
    } catch (error: any) {
      logger.error('Authentication Error', { error });
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Token Provided');
    }
  }
}

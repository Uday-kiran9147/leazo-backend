import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import ApiError, { handleError } from '../../utils/api_error';
import { logger } from '../../utils/logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If it's already a NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      return response.status(status).json(
        typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { statusCode: status, message: exceptionResponse }
      );
    }

    // Process using existing Leazo ApiError / handleError utility
    const apiResponse = handleError(exception, request, response);

    if (apiResponse.status === 500) {
      logger.error(`Internal Server Error: ${request.method} ${request.url}`, {
        error: (exception as any)?.message,
        stack: (exception as any)?.stack,
        body: request.body,
        query: request.query,
        params: request.params,
        user: (request as any).user?.id,
      });
    }

    if (!response.headersSent) {
      return response.status(apiResponse.status).json(apiResponse);
    }
  }
}

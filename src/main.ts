import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' :
  nodeEnv === 'test' ? '.env.test' : '.env.development';

logger.info(`Environment: ${nodeEnv}: loading variables from ${envFile}`);

dotenv.config({
  path: [path.resolve(process.cwd(), envFile)]
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { connectToDatabase } from './config/db';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import express from 'express';

export async function bootstrap() {
  await connectToDatabase();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors();
  app.useGlobalFilters(new AllExceptionsFilter());

  // Raw body parsing for webhooks
  app.use('/v1/api/webhooks/razorpay', express.raw({ type: 'application/json' }));
  app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const port = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'test') {
    await app.listen(port);
    logger.success(`Server established successfully with NestJS!`, {
      port,
      url: `http://localhost:${port}`,
      env: nodeEnv
    });
  }

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

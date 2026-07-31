import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import { logger } from './utils/logger';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { connectToDatabase } from './config/db';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { INestApplication } from '@nestjs/common';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' :
  nodeEnv === 'test' ? '.env.test' : '.env.development';

dotenv.config({
  path: [path.resolve(process.cwd(), envFile)]
});

const server = express();
const adapter = new ExpressAdapter(server);

let nestAppInstance: INestApplication | null = null;

export async function initApp(): Promise<{ server: express.Application; nestApp: INestApplication }> {
  if (nestAppInstance) {
    return { server, nestApp: nestAppInstance };
  }

  if (process.env.NODE_ENV !== 'test') {
    await connectToDatabase();
  }

  const app = await NestFactory.create(AppModule, adapter, {
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });

  app.enableCors();
  app.useGlobalFilters(new AllExceptionsFilter());

  app.use('/v1/api/webhooks/razorpay', express.raw({ type: 'application/json' }));
  app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  await app.init();
  nestAppInstance = app;
  return { server, nestApp: app };
}

// Pre-initialize for integration tests when app is imported
let isInitStarted = false;
server.use((req, res, next) => {
  if (nestAppInstance) {
    return next();
  }
  if (!isInitStarted) {
    isInitStarted = true;
    initApp().then(() => next()).catch(next);
  } else {
    const interval = setInterval(() => {
      if (nestAppInstance) {
        clearInterval(interval);
        next();
      }
    }, 20);
  }
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  initApp().then(() => {
    server.listen(PORT, () => {
      logger.success(`Server established successfully with NestJS!`, {
        port: PORT,
        url: `http://localhost:${PORT}`,
        env: nodeEnv
      });
    });
  });
}

export default server;

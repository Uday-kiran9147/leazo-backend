import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OwnersModule } from './modules/owners/owners.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlansModule } from './modules/plans/plans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UploadModule } from './modules/upload/upload.module';
import { CronModule } from './modules/cron/cron.module';
import { logger } from './utils/logger';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' :
  nodeEnv === 'test' ? '.env.test' : '.env.development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), envFile)],
    }),
    AuthModule,
    UsersModule,
    OwnersModule,
    AdminModule,
    PlansModule,
    PaymentsModule,
    UploadModule,
    CronModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: any) => {
        logger.info(`${req.method} ${req.originalUrl}`);
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

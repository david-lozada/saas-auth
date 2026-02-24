import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AdminModule } from './admin/admin.module';
import configurations from './config/configurations';
import { DatabaseConfig } from './config/config.types';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { TenantModule } from './tenant/tenant.module';
import { envValidationSchema } from './config/env.validation';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService<{ database: DatabaseConfig }>,
      ) => ({
        uri: configService.get<string>('database.uri', { infer: true })!,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AdminModule,
    BootstrapModule,
    TenantModule,
    SubscriptionModule,
  ],

  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        'tenants/*path',
        'subscriptions/webhook',
        'subscriptions/binance',
      )

      .forRoutes('*');
  }
}

// src/bootstrap/bootstrap.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SetupToken, SetupTokenSchema } from '../schemas/setup-token.schema';
import { BootstrapService } from './bootstrap.service';
import { SeedService } from './seed.service';
import { BootstrapController } from './bootstrap.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SetupTokenRepository } from './repositories/setup-token.repository';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SetupToken.name, schema: SetupTokenSchema },
    ]),
    ConfigModule,
    AuthModule,
    SubscriptionModule,
  ],
  providers: [BootstrapService, SeedService, SetupTokenRepository],
  controllers: [BootstrapController],
  exports: [BootstrapService, SeedService, SetupTokenRepository],
})
export class BootstrapModule {
  // Conditionally register controller based on environment
  static register() {
    const config = new ConfigService();
    const env = config.get('NODE_ENV', 'development');

    // Only register HTTP endpoints in development
    const controllers = env === 'development' ? [BootstrapController] : [];

    return {
      module: BootstrapModule,
      controllers,
    };
  }
}

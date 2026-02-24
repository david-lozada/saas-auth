// src/bootstrap/bootstrap.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { SetupToken, SetupTokenSchema } from '../schemas/setup-token.schema';
import { Plan, PlanSchema } from '../schemas/plan.schema';
import { BootstrapService } from './bootstrap.service';
import { SeedService } from './seed.service';
import { BootstrapController } from './bootstrap.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SetupToken.name, schema: SetupTokenSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
    ConfigModule,
  ],
  providers: [BootstrapService, SeedService],
  controllers: [BootstrapController],
  exports: [BootstrapService, SeedService],
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

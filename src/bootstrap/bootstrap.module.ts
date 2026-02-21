// src/bootstrap/bootstrap.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { BootstrapService } from './bootstrap.service';
import { BootstrapController } from './bootstrap.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    ConfigModule,
  ],
  providers: [BootstrapService],
  controllers: [BootstrapController],
  exports: [BootstrapService],
})
export class BootstrapModule {}
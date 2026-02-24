// tenant.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { TenantMiddleware } from './tenant.middleware';
import { TenantController } from './tenant.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])
  ],
  controllers: [TenantController],
  exports: [MongooseModule], // Export so other modules can use TenantModel
})
export class TenantModule {}
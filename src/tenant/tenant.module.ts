// tenant.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { TenantMiddleware } from './tenant.middleware';
import { TenantController } from './tenant.controller';
import { TenantRepository } from './repositories/tenant.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [TenantController],
  providers: [TenantRepository],
  exports: [TenantRepository, MongooseModule], // Export TenantRepository
})
export class TenantModule {}

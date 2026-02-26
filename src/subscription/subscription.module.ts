import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from '../schemas/plan.schema';
import { TenantModule } from '../tenant/tenant.module';
import {
  PagoMovilTransaction,
  PagoMovilTransactionSchema,
} from '../schemas/pago-movil-transaction.schema';
import {
  PagoMovilConfig,
  PagoMovilConfigSchema,
} from '../schemas/pago-movil-config.schema';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeService } from './stripe.service';
import { BinancePayService } from './binance-pay.service';
import { PagoMovilService } from './pago-movil.service';
import { PagoMovilController } from './pago-movil.controller';
import { WebhooksController } from './webhooks.controller';
import { ConfigModule } from '@nestjs/config';

import { PlanRepository } from './repositories/plan.repository';
import { PagoMovilTransactionRepository } from './repositories/pago-movil-transaction.repository';
import { PagoMovilConfigRepository } from './repositories/pago-movil-config.repository';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: PagoMovilTransaction.name, schema: PagoMovilTransactionSchema },
      { name: PagoMovilConfig.name, schema: PagoMovilConfigSchema },
    ]),
    ConfigModule,
    TenantModule,
  ],
  controllers: [
    SubscriptionController,
    WebhooksController,
    PagoMovilController,
  ],
  providers: [
    PlanRepository,
    PagoMovilTransactionRepository,
    PagoMovilConfigRepository,
    SubscriptionService,
    StripeService,
    BinancePayService,
    PagoMovilService,
  ],
  exports: [
    PlanRepository,
    PagoMovilTransactionRepository,
    PagoMovilConfigRepository,
    SubscriptionService,
    StripeService,
    BinancePayService,
    PagoMovilService,
  ],
})
export class SubscriptionModule {}

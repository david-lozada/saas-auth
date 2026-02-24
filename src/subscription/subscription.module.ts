import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from '../schemas/plan.schema';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
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

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: PagoMovilTransaction.name, schema: PagoMovilTransactionSchema },
      { name: PagoMovilConfig.name, schema: PagoMovilConfigSchema },
    ]),
    ConfigModule,
  ],
  controllers: [
    SubscriptionController,
    WebhooksController,
    PagoMovilController,
  ],
  providers: [
    SubscriptionService,
    StripeService,
    BinancePayService,
    PagoMovilService,
  ],
  exports: [
    SubscriptionService,
    StripeService,
    BinancePayService,
    PagoMovilService,
  ],
})
export class SubscriptionModule {}

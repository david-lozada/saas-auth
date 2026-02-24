import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { TenantContextDto } from '../auth/dto';
import { StripeService } from './stripe.service';
import { BinancePayService } from './binance-pay.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private stripeService: StripeService,
    private binancePayService: BinancePayService,
    private configService: ConfigService,
  ) {}

  async createCheckoutSession(context: TenantContextDto, planId: string) {
    const [tenant, plan] = await Promise.all([
      this.tenantModel.findById(context.tenantId),
      this.planModel.findById(planId),
    ]);

    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.priceId)
      throw new BadRequestException('Plan has no Stripe price ID');

    let customerId = tenant.subscription?.customerId;

    // Create Stripe customer if it doesn't exist
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(
        `${tenant.slug}@example.com`, // Placeholder email or use tenant contact
        tenant.name,
        { tenantId: tenant._id.toString() },
      );
      customerId = customer.id;
      await this.tenantModel.findByIdAndUpdate(context.tenantId, {
        'subscription.customerId': customerId,
      });
    }

    const successUrl =
      this.configService.get<string>('stripe.successUrl') || '';
    const cancelUrl = this.configService.get<string>('stripe.cancelUrl') || '';

    return this.stripeService.createCheckoutSession(
      customerId || '',
      plan.priceId,
      successUrl,
      cancelUrl,
      { tenantId: tenant._id.toString(), planId: plan._id.toString() },
    );
  }

  async createBinanceOrder(context: TenantContextDto, planId: string) {
    const [tenant, plan] = await Promise.all([
      this.tenantModel.findById(context.tenantId),
      this.planModel.findById(planId),
    ]);

    if (!tenant || !plan)
      throw new NotFoundException('Tenant or Plan not found');

    const result = await this.binancePayService.createOrder({
      amount: plan.amount / 100, // Binance uses decimal
      currency: 'USDT',
      description: `Subscription: ${plan.label}`,
      orderId: `${tenant._id}_${Date.now()}`,
      successUrl: this.configService.get<string>('binance.successUrl') || '',
      cancelUrl: this.configService.get<string>('binance.cancelUrl') || '',
    });

    return { url: result.checkoutUrl };
  }

  async createPortalSession(context: TenantContextDto) {
    const tenant = await this.tenantModel.findById(context.tenantId);
    if (!tenant || !tenant.subscription?.customerId) {
      throw new BadRequestException('No Stripe customer found for this tenant');
    }

    const returnUrl = this.configService.get<string>('stripe.successUrl') || ''; // Redirect back to billing
    return this.stripeService.createPortalSession(
      tenant.subscription.customerId || '',
      returnUrl,
    );
  }

  async handleWebhookEvent(event: any) {
    // Process Stripe webhook events (invoice.paid, customer.subscription.deleted, etc.)
    const session = event.data.object;
    const metadata = session.metadata;

    switch (event.type) {
      case 'checkout.session.completed':
        if (metadata.tenantId && metadata.planId) {
          await this.tenantModel.findByIdAndUpdate(metadata.tenantId, {
            plan: metadata.planId,
            'subscription.status': 'active',
            'subscription.subscriptionId': session.subscription,
          });
        }
        break;

      case 'customer.subscription.deleted':
        await this.tenantModel.findOneAndUpdate(
          { 'subscription.subscriptionId': session.id },
          { 'subscription.status': 'canceled' },
        );
        break;

      case 'binance.payment.success':
        // Custom logic for Binance / Pago Directo success
        const body = event.data;
        const tenantId =
          body.tenantId || (body.metadata && body.metadata.tenantId);
        const planId = body.planId || (body.metadata && body.metadata.planId);

        if (tenantId && planId) {
          await this.activateSubscription(tenantId, planId, {
            paymentMethod: event.type.split('.')[0],
            transactionId:
              body.merchantTradeNo || body.transactionId || body.externalId,
          });
          this.logger.log(`Payment confirmed and activated via ${event.type}`);
        }
        break;

      // Add more cases as needed
    }
  }

  async listPlans() {
    return this.planModel.find({ isActive: true }).sort({ amount: 1 });
  }

  async getTenantSubscription(context: TenantContextDto) {
    const tenant = await this.tenantModel
      .findById(context.tenantId)
      .populate('plan')
      .exec();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      plan: tenant.plan,
      subscription: tenant.subscription,
    };
  }

  async updateTenantPlan(context: TenantContextDto, planId: string) {
    const plan = await this.planModel.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const tenant = await this.tenantModel
      .findByIdAndUpdate(
        context.tenantId,
        {
          plan: planId,
          'subscription.status': 'active', // Simplified for now
        },
        { new: true },
      )
      .populate('plan');

    return tenant;
  }

  // Helper to check if tenant has a specific feature
  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .populate('plan')
      .lean();

    if (!tenant || !tenant.plan) return false;

    const plan = tenant.plan as unknown as Plan;
    return plan.features.includes(feature);
  }

  async createSubscriptionFromPayment(data: {
    userId: string;
    tenantId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentReference: string;
    transactionId: string;
    planId?: string; // Optional if we search the pending transaction
  }) {
    // If planId is not provided, we might need a way to find it,
    // but PagoMovilService should know it since we added it to the transaction.
    // However, to keep it simple, we expect the caller to pass it or we fetch it from the tenant context.

    // For manual Pago Movil, the planId MUST be known.
    if (!data.planId) {
      // In a real scenario, we'd fetch the pending PM transaction to find the planId
      throw new BadRequestException('Plan ID is required for activation');
    }

    return this.activateSubscription(data.tenantId, data.planId, {
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      reference: data.paymentReference,
    });
  }

  private async activateSubscription(
    tenantId: string,
    planId: string,
    metadata: any,
  ) {
    const plan = await this.planModel.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');

    // Calculate expiration date
    const expirationDate = new Date();
    if (plan.interval === 'month') {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else if (plan.interval === 'year') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else if (plan.interval === 'lifetime') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 100);
    }

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(
        tenantId,
        {
          plan: planId,
          'subscription.status': 'active',
          'subscription.currentPeriodEnd': expirationDate,
          'subscription.lastPaymentMethod': metadata.paymentMethod,
          'subscription.lastTransactionId': metadata.transactionId,
          'subscription.metadata': {
            ...metadata,
            activatedAt: new Date(),
          },
        },
        { new: true },
      )
      .populate('plan');

    this.logger.log(
      `Subscription activated for tenant ${tenantId} on plan ${plan.name}`,
    );
    return updatedTenant;
  }

  async checkSubscriptionWarning(tenantId: string) {
    const tenant = await this.tenantModel.findById(tenantId).lean();
    if (!tenant || !tenant.subscription?.currentPeriodEnd) return null;

    const today = new Date();
    const expiry = new Date(tenant.subscription.currentPeriodEnd);
    const diffDays = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 0) {
      return { status: 'expired', daysLeft: 0 };
    }

    if (diffDays <= 3) {
      return {
        status: 'warning',
        daysLeft: diffDays,
        message: `Your subscription will expire in ${diffDays} days. Please renew soon.`,
      };
    }

    return { status: 'ok', daysLeft: diffDays };
  }
}

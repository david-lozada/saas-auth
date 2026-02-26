import { Injectable, Logger } from '@nestjs/common';
import { PlanRepository } from '../subscription/repositories/plan.repository';
import { StripeService } from '../subscription/stripe.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private planRepository: PlanRepository,
    private stripeService: StripeService,
  ) {}

  async seedPlans() {
    this.logger.log('Starting plan seeding...');

    // Define your plan tiers here
    const plansToSeed = [
      {
        name: 'free_tier',
        label: 'Free',
        description: 'Basic features for small teams',
        amount: 0,
        currency: 'usd',
        interval: 'month',
        features: ['basic_auth', 'single_tenant'],
        metadata: { maxUsers: 5 },
      },
      {
        name: 'pro_tier',
        label: 'Pro',
        description: 'Advanced features for growing businesses',
        amount: 2900, // $29.00
        currency: 'usd',
        interval: 'month',
        features: [
          'basic_auth',
          'advanced_analytics',
          'multiple_tenants',
          'api_access',
        ],
        metadata: { maxUsers: 50 },
      },
      {
        name: 'enterprise_tier',
        label: 'Enterprise',
        description: 'Custom solutions for large organizations',
        amount: 9900, // $99.00
        currency: 'usd',
        interval: 'month',
        features: [
          'basic_auth',
          'advanced_analytics',
          'multiple_tenants',
          'api_access',
          'sso',
          'dedicated_support',
        ],
        metadata: { maxUsers: 500 },
      },
    ];

    for (const planData of plansToSeed) {
      // 1. Check if plan exists in DB
      let existingPlan = await this.planRepository.findOne({
        name: planData.name,
      });

      if (existingPlan && existingPlan.priceId) {
        this.logger.log(
          `Plan ${planData.name} already exists with priceId ${existingPlan.priceId}. Skipping Stripe creation.`,
        );
        continue;
      }

      this.logger.log(`Syncing plan ${planData.name} with Stripe...`);

      // 2. Create in Stripe (Product + Price)
      try {
        const stripePriceId = await this.syncWithStripe(planData);

        if (existingPlan) {
          await this.planRepository.findOneAndUpdate(
            { name: planData.name },
            { priceId: stripePriceId },
          );
        } else {
          await this.planRepository.create({
            ...planData,
            priceId: stripePriceId,
          });
        }
        this.logger.log(`✅ Plan ${planData.name} seeded successfully.`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to seed plan ${planData.name}: ${error.message}`,
        );
      }
    }
  }

  private async syncWithStripe(planData: any): Promise<string> {
    // This logic would ideally live in StripeService, but for the seed script:
    const stripe = (this.stripeService as any).stripe;

    // Create Product
    const product = await stripe.products.create({
      name: planData.label,
      description: planData.description,
      metadata: { plan_name: planData.name },
    });

    // Create Price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: planData.amount,
      currency: planData.currency,
      recurring: {
        interval: planData.interval,
      },
      metadata: { plan_name: planData.name },
    });

    return price.id;
  }
}

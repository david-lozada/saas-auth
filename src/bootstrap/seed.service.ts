import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import { StripeService } from '../subscription/stripe.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
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
      let existingPlan = await this.planModel.findOne({ name: planData.name });

      if (existingPlan && existingPlan.priceId) {
        this.logger.log(
          `Plan ${planData.name} already exists with priceId ${existingPlan.priceId}. Skipping Stripe creation.`,
        );
        continue;
      }

      this.logger.log(`Syncing plan ${planData.name} with Stripe...`);

      // 2. Create in Stripe (Product + Price)
      // Note: In a real scenario, you might want to check Stripe first or handle updates.
      // This is a simplified "create-only" seed.
      try {
        // Stripe SDK v20+ usage via our service
        // Since we don't have a direct "createPlan" in StripeService yet,
        // we'll access the stripe instance or add the method.
        // Let's assume we add a 'syncPlanWithStripe' to StripeService for better encapsulation.

        // For now, let's keep it simple and assume StripeService has what we need or we add it.
        const stripePriceId = await this.syncWithStripe(planData);

        if (existingPlan) {
          existingPlan.priceId = stripePriceId;
          await existingPlan.save();
        } else {
          await this.planModel.create({
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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      this.logger.warn(
        'Stripe secret key is missing. Stripe integration will not work.',
      );
    }
    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-02-15.acacia', // Best practice to use a fixed version
    });
  }

  async createCustomer(email: string, name: string, metadata: any) {
    return this.stripe.customers.create({
      email,
      name,
      metadata,
    });
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: any,
  ) {
    return this.stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async constructEvent(body: string | Buffer, sig: string, secret: string) {
    return this.stripe.webhooks.constructEvent(body, sig, secret);
  }

  // Add more methods as needed (cancel subscription, update plan, etc.)
}

import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe Webhook handler' })
  async handleStripeWebhook(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );

    if (!sig || !webhookSecret) {
      this.logger.error('Missing stripe-signature or webhook secret');
      throw new BadRequestException('Webhook Error');
    }

    let event;

    try {
      // In Fastify, req.raw.body is not available by default.
      // We might need to handle the raw body buffering or use a middleware.
      // For now, assuming raw body is handled or this is a standard config.
      const rawBody = (req as any).rawBody || req.body;

      event = await this.stripeService.constructEvent(
        rawBody,
        sig,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await this.subscriptionService.handleWebhookEvent(event);

    return res.status(200).send({ received: true });
  }

  @Public()
  @Post('binance')
  @ApiOperation({ summary: 'Binance Pay Webhook handler' })
  async handleBinanceWebhook(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    this.logger.log('Received Binance Pay webhook');
    // Verify signature logic...
    await this.subscriptionService.handleWebhookEvent({
      type: 'binance.payment.success',
      data: req.body,
    });
    return res.status(200).send({ returnCode: 'SUCCESS', returnMessage: null });
  }
}

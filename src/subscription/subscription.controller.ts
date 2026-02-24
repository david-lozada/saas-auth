import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { TenantContext } from '../auth/decorators/tenant-context.decorator';
import { TenantContextDto } from '../auth/dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all available subscription plans' })
  async listPlans() {
    return this.subscriptionService.listPlans();
  }

  @Get('my-subscription')
  @ApiOperation({ summary: 'Get current tenant subscription details' })
  async getMySubscription(@TenantContext() context: TenantContextDto) {
    return this.subscriptionService.getTenantSubscription(context);
  }

  @Post('update-plan')
  @ApiOperation({ summary: 'Update tenant plan' })
  async updatePlan(
    @TenantContext() context: TenantContextDto,
    @Body('planId') planId: string,
  ) {
    return this.subscriptionService.updateTenantPlan(context, planId);
  }

  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  async createCheckout(
    @TenantContext() context: TenantContextDto,
    @Body('planId') planId: string,
  ) {
    const session = await this.subscriptionService.createCheckoutSession(
      context,
      planId,
    );
    return { url: session.url };
  }

  @Post('create-portal-session')
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session' })
  async createPortal(@TenantContext() context: TenantContextDto) {
    const session = await this.subscriptionService.createPortalSession(context);
    return { url: session.url };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get current subscription status and renewal warnings',
  })
  async getStatus(@TenantContext() context: TenantContextDto) {
    return this.subscriptionService.checkSubscriptionWarning(context.tenantId);
  }

  @Post('create-binance-order')
  @ApiOperation({ summary: 'Create a Binance Pay order' })
  async createBinance(
    @TenantContext() context: TenantContextDto,
    @Body('planId') planId: string,
  ) {
    return this.subscriptionService.createBinanceOrder(context, planId);
  }
}

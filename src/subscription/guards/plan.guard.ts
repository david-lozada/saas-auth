import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';
import { FEATURE_KEY } from '../decorators/requires-feature.decorator';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const hasFeature = await this.subscriptionService.hasFeature(
      tenantContext.tenantId,
      requiredFeature,
    );

    if (!hasFeature) {
      throw new ForbiddenException(
        `Your current plan does not support the '${requiredFeature}' feature.`,
      );
    }

    return true;
  }
}

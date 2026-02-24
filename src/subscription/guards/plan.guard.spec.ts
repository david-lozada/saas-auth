import { Test, TestingModule } from '@nestjs/testing';
import { PlanGuard } from './plan.guard';
import { SubscriptionService } from '../subscription.service';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('PlanGuard', () => {
  let guard: PlanGuard;
  let subscriptionService: any;
  let reflector: any;

  beforeEach(async () => {
    subscriptionService = {
      hasFeature: jest.fn(),
    };
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGuard,
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<PlanGuard>(PlanGuard);
  });

  it('should allow access if no feature is required', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if tenant has the required feature', async () => {
    reflector.getAllAndOverride.mockReturnValue('premium_feature');
    subscriptionService.hasFeature.mockResolvedValue(true);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext: { tenantId: 'tenant_123' },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(subscriptionService.hasFeature).toHaveBeenCalledWith(
      'tenant_123',
      'premium_feature',
    );
  });

  it('should throw ForbiddenException if tenant lacks the feature', async () => {
    reflector.getAllAndOverride.mockReturnValue('premium_feature');
    subscriptionService.hasFeature.mockResolvedValue(false);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext: { tenantId: 'tenant_123' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

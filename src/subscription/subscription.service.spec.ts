import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { BinancePayService } from './binance-pay.service';
import { ConfigService } from '@nestjs/config';
import { PlanRepository } from './repositories/plan.repository';
import { TenantRepository } from '../tenant/repositories/tenant.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let planRepository: any;
  let tenantRepository: any;
  let stripeService: any;

  const mockPlan = {
    _id: 'plan_123',
    name: 'pro_tier',
    priceId: 'price_abc',
    features: ['analytics'],
    label: 'Pro',
    amount: 2900,
    interval: 'month',
  };

  const mockTenant = {
    _id: 'tenant_123',
    slug: 'test-tenant',
    name: 'Test Tenant',
    subscription: {
      customerId: 'cus_123',
    },
  };

  beforeEach(async () => {
    planRepository = {
      findActivePlans: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    tenantRepository = {
      findById: jest.fn(),
      findByIdWithPlan: jest.fn(),
      findByIdWithPlanLean: jest.fn(),
      findByIdLean: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndUpdateWithPlan: jest.fn(),
      updateSubscriptionStatusBySubId: jest.fn(),
    };

    stripeService = {
      createCustomer: jest.fn(),
      createCheckoutSession: jest.fn(),
      createPortalSession: jest.fn(),
    };

    const binancePayService = {
      createOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PlanRepository,
          useValue: planRepository,
        },
        {
          provide: TenantRepository,
          useValue: tenantRepository,
        },
        {
          provide: StripeService,
          useValue: stripeService,
        },
        {
          provide: BinancePayService,
          useValue: binancePayService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'stripe.successUrl') return 'http://success';
              if (key === 'stripe.cancelUrl') return 'http://cancel';
              if (key === 'binance.successUrl') return 'http://binance-success';
              if (key === 'binance.cancelUrl') return 'http://binance-cancel';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should list active plans', async () => {
    planRepository.findActivePlans.mockResolvedValue([mockPlan]);
    const plans = await service.listPlans();
    expect(plans).toContain(mockPlan);
    expect(planRepository.findActivePlans).toHaveBeenCalled();
  });

  it('should create a checkout session', async () => {
    tenantRepository.findById.mockResolvedValue(mockTenant);
    planRepository.findById.mockResolvedValue(mockPlan);
    stripeService.createCheckoutSession.mockResolvedValue({
      url: 'http://stripe-url',
    });

    const context = { tenantId: 'tenant_123' } as any;
    const result = await service.createCheckoutSession(context, 'plan_123');

    expect(result.url).toBe('http://stripe-url');
    expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
      'cus_123',
      'price_abc',
      'http://success',
      'http://cancel',
      expect.any(Object),
    );
  });

  it('should throw if plan has no priceId', async () => {
    tenantRepository.findById.mockResolvedValue(mockTenant);
    planRepository.findById.mockResolvedValue({ ...mockPlan, priceId: null });

    const context = { tenantId: 'tenant_123' } as any;
    await expect(
      service.createCheckoutSession(context, 'plan_123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should check for features correctly', async () => {
    tenantRepository.findByIdWithPlanLean.mockResolvedValue({
      plan: mockPlan,
    });

    const hasAnalytics = await service.hasFeature('tenant_123', 'analytics');
    const hasSSO = await service.hasFeature('tenant_123', 'sso');

    expect(hasAnalytics).toBe(true);
    expect(hasSSO).toBe(false);
  });

  it('should create a Binance Pay order', async () => {
    tenantRepository.findById.mockResolvedValue(mockTenant);
    planRepository.findById.mockResolvedValue(mockPlan);
    const binancePayService = service['binancePayService'] as any;
    binancePayService.createOrder.mockResolvedValue({
      checkoutUrl: 'http://binance-url',
    });

    const context = { tenantId: 'tenant_123' } as any;
    const result = await service.createBinanceOrder(context, 'plan_123');

    expect(result.url).toBe('http://binance-url');
  });
});

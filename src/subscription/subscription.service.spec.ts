import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { BinancePayService } from './binance-pay.service';
import { ConfigService } from '@nestjs/config';
import { Plan } from '../schemas/plan.schema';
import { Tenant } from '../schemas/tenant.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let planModel: any;
  let tenantModel: any;
  let stripeService: any;

  const mockPlan = {
    _id: 'plan_123',
    name: 'pro_tier',
    priceId: 'price_abc',
    features: ['analytics'],
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
    planModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      findOne: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    tenantModel = {
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      lean: jest.fn(),
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
          provide: getModelToken(Plan.name),
          useValue: planModel,
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: tenantModel,
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
    planModel.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockPlan]),
    });
    const plans = await service.listPlans();
    expect(plans).toContain(mockPlan);
    expect(planModel.find).toHaveBeenCalledWith({ isActive: true });
  });

  it('should create a checkout session', async () => {
    tenantModel.findById.mockResolvedValue(mockTenant);
    planModel.findById.mockResolvedValue(mockPlan);
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
    tenantModel.findById.mockResolvedValue(mockTenant);
    planModel.findById.mockResolvedValue({ ...mockPlan, priceId: null });

    const context = { tenantId: 'tenant_123' } as any;
    await expect(
      service.createCheckoutSession(context, 'plan_123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should check for features correctly', async () => {
    tenantModel.findById.mockReturnThis();
    tenantModel.populate.mockReturnThis();
    tenantModel.lean.mockResolvedValue({
      plan: mockPlan,
    });

    const hasAnalytics = await service.hasFeature('tenant_123', 'analytics');
    const hasSSO = await service.hasFeature('tenant_123', 'sso');

    expect(hasAnalytics).toBe(true);
    expect(hasSSO).toBe(false);
  });

  it('should create a Binance Pay order', async () => {
    tenantModel.findById.mockResolvedValue(mockTenant);
    planModel.findById.mockResolvedValue(mockPlan);
    const binancePayService = service['binancePayService'] as any;
    binancePayService.createOrder.mockResolvedValue({
      checkoutUrl: 'http://binance-url',
    });

    const context = { tenantId: 'tenant_123' } as any;
    const result = await service.createBinanceOrder(context, 'plan_123');

    expect(result.url).toBe('http://binance-url');
  });
});

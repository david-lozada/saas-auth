import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { StripeService } from '../subscription/stripe.service';
import { Plan } from '../schemas/plan.schema';

describe('SeedService', () => {
  let service: SeedService;
  let planModel: any;
  let stripeService: any;
  let mockStripeInstance: any;

  beforeEach(async () => {
    mockStripeInstance = {
      products: {
        create: jest.fn().mockResolvedValue({ id: 'prod_123' }),
      },
      prices: {
        create: jest.fn().mockResolvedValue({ id: 'price_abc' }),
      },
    };

    planModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    stripeService = {
      stripe: mockStripeInstance, // Accessing private through mock
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getModelToken(Plan.name),
          useValue: planModel,
        },
        {
          provide: StripeService,
          useValue: {
            // Mocking the structure expected in SeedService
            stripe: mockStripeInstance,
          },
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should seed plans if they do not exist', async () => {
    planModel.findOne.mockResolvedValue(null); // Plan doesn't exist

    await service.seedPlans();

    // Verify Stripe was called
    expect(mockStripeInstance.products.create).toHaveBeenCalled();
    expect(mockStripeInstance.prices.create).toHaveBeenCalled();

    // Verify DB was updated
    expect(planModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'free_tier',
        priceId: 'price_abc',
      }),
    );
  });

  it('should skip seeding if plan already exists with priceId', async () => {
    planModel.findOne.mockResolvedValue({
      name: 'free_tier',
      priceId: 'existing_price',
    });

    await service.seedPlans();

    expect(mockStripeInstance.products.create).not.toHaveBeenCalled();
    expect(planModel.create).not.toHaveBeenCalled();
  });
});

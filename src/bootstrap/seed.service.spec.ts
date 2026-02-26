import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service';
import { PlanRepository } from '../subscription/repositories/plan.repository';
import { StripeService } from '../subscription/stripe.service';

describe('SeedService', () => {
  let service: SeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: PlanRepository,
          useValue: {},
        },
        {
          provide: StripeService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

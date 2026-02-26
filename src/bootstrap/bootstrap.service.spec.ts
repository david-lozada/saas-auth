import { Test, TestingModule } from '@nestjs/testing';
import { BootstrapService } from './bootstrap.service';
import { UserRepository } from '../auth/repositories/user.repository';
import { SetupTokenRepository } from './repositories/setup-token.repository';
import { ConfigService } from '@nestjs/config';

describe('BootstrapService', () => {
  let service: BootstrapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapService,
        {
          provide: UserRepository,
          useValue: {},
        },
        {
          provide: SetupTokenRepository,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BootstrapService>(BootstrapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

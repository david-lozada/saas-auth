import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';
import { InviteRepository } from './repositories/invite.repository';
import { DeviceRepository } from './repositories/device.repository';
import { TenantRepository } from '../tenant/repositories/tenant.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {},
        },
        {
          provide: InviteRepository,
          useValue: {},
        },
        {
          provide: DeviceRepository,
          useValue: {},
        },
        {
          provide: TenantRepository,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { UserRepository } from '../auth/repositories/user.repository';
import { InviteRepository } from '../auth/repositories/invite.repository';
import { DeviceRepository } from '../auth/repositories/device.repository';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
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
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

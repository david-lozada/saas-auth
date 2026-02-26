import { Test, TestingModule } from '@nestjs/testing';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';

describe('BootstrapController', () => {
  let controller: BootstrapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BootstrapController],
      providers: [
        {
          provide: BootstrapService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<BootstrapController>(BootstrapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

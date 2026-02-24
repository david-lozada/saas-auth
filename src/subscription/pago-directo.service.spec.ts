import { Test, TestingModule } from '@nestjs/testing';
import { PagoDirectoService } from './pago-directo.service';
import { ConfigService } from '@nestjs/config';

describe('PagoDirectoService', () => {
  let service: PagoDirectoService;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key) => {
        if (key === 'pagoDirecto.apiKey') return 'test_api_key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagoDirectoService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PagoDirectoService>(PagoDirectoService);
  });

  it('should create a transaction successfully', async () => {
    const result = await service.createTransaction({
      amount: 100,
      description: 'Test Order',
      orderId: 'order_123',
      tenantSlug: 'test-tenant',
    });

    expect(result.paymentUrl).toContain('checkout.pagodirecto.com.ve');
    expect(result.transactionId).toBe('pd_order_123');
  });
});

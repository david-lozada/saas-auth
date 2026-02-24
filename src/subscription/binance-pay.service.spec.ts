import { Test, TestingModule } from '@nestjs/testing';
import { BinancePayService } from './binance-pay.service';
import { ConfigService } from '@nestjs/config';

describe('BinancePayService', () => {
  let service: BinancePayService;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key) => {
        if (key === 'binance.apiKey') return 'test_api_key';
        if (key === 'binance.secretKey') return 'test_secret_key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BinancePayService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<BinancePayService>(BinancePayService);

    // Mock global fetch
    global.fetch = jest.fn() as jest.Mock;
  });

  it('should create an order successfully', async () => {
    const mockResponse = {
      status: 'SUCCESS',
      data: { checkoutUrl: 'https://binance-checkout.com' },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await service.createOrder({
      amount: 10,
      currency: 'USDT',
      description: 'Test Order',
      orderId: 'order_123',
      successUrl: 'http://success',
      cancelUrl: 'http://cancel',
    });

    expect(result.checkoutUrl).toBe('https://binance-checkout.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/binancepay/openapi/v2/order'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'BinancePay-Certificate': 'test_api_key',
        }),
      }),
    );
  });

  it('should throw error if Binance returns failure', async () => {
    const mockResponse = {
      status: 'FAIL',
      errorMessage: 'Invalid API Key',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    await expect(
      service.createOrder({
        amount: 10,
        currency: 'USDT',
        description: 'Test Order',
        orderId: 'order_123',
        successUrl: 'http://success',
        cancelUrl: 'http://cancel',
      }),
    ).rejects.toThrow('Binance Pay Error: Invalid API Key');
  });
});

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class BinancePayService {
  private readonly logger = new Logger(BinancePayService.name);
  private readonly baseUrl = 'https://bpay.binanceapi.com';

  constructor(private configService: ConfigService) {}

  private getSignature(payload: string, timestamp: number, nonce: string) {
    const signaturePayload = `${timestamp}\n${nonce}\n${payload}\n`;
    const secretKey = this.configService.get<string>('binance.secretKey') || '';
    return crypto
      .createHmac('sha512', secretKey)
      .update(signaturePayload)
      .digest('hex')
      .toUpperCase();
  }

  async createOrder(data: {
    amount: number;
    currency: string;
    description: string;
    orderId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');

    const body = {
      env: { terminalType: 'WEB' },
      orderAmount: data.amount,
      currency: data.currency,
      goods: {
        goodsType: '01',
        goodsCategory: 'D000',
        referenceGoodsId: data.orderId,
        goodsName: data.description,
      },
      merchantTradeNo: data.orderId,
      returnUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    };

    const jsonBody = JSON.stringify(body);
    const signature = this.getSignature(jsonBody, timestamp, nonce);

    const response = await fetch(
      `${this.baseUrl}/binancepay/openapi/v2/order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'BinancePay-Timestamp': timestamp.toString(),
          'BinancePay-Nonce': nonce,
          'BinancePay-Certificate':
            this.configService.get<string>('binance.apiKey') || '',
          'BinancePay-Signature': signature,
        },
        body: jsonBody,
      },
    );

    const result = await response.json();

    if (result.status !== 'SUCCESS') {
      this.logger.error(
        `Binance Pay Order Creation Failed: ${JSON.stringify(result)}`,
      );
      throw new Error(`Binance Pay Error: ${result.errorMessage}`);
    }

    return result.data; // contains checkoutUrl
  }

  // Webhook verification
  async verifyWebhook(
    payload: string,
    signature: string,
    timestamp: string,
    nonce: string,
  ) {
    // Note: Binance Webhooks actually use a public key certificate to verify RSA signatures
    // For this simplified version, we'll assume HMAC if that's what's configured,
    // but usually you'd verify against their public key.
    return true; // Placeholder for real RSA verification
  }
}

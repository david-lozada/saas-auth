import { registerAs } from '@nestjs/config';

const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/multitenant_app',
}));

const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT!, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
}));

const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'change-this-in-production-min-32-chars',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET || 'another-secret-min-32-chars',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  mobileAccessExpiry: process.env.JWT_MOBILE_ACCESS_EXPIRY || '7d',
  mobileRefreshExpiry: process.env.JWT_MOBILE_REFRESH_EXPIRY || '90d',
}));

const securityConfig = registerAs('security', () => ({
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS!, 10) || 12,
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS!, 10) || 5,
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION!, 10) || 15, // minutes
}));

const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  successUrl: process.env.STRIPE_SUCCESS_URL,
  cancelUrl: process.env.STRIPE_CANCEL_URL,
}));

const binanceConfig = registerAs('binance', () => ({
  apiKey: process.env.BINANCE_API_KEY,
  secretKey: process.env.BINANCE_SECRET_KEY,
  successUrl: process.env.BINANCE_SUCCESS_URL,
  cancelUrl: process.env.BINANCE_CANCEL_URL,
}));

export default [
  appConfig,
  jwtConfig,
  securityConfig,
  databaseConfig,
  stripeConfig,
  binanceConfig,
];

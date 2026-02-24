import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string()
    .required()
    .description('Database connection string'),
  JWT_SECRET: Joi.string().required().description('JWT access token secret'),
  JWT_REFRESH_SECRET: Joi.string()
    .required()
    .description('JWT refresh token secret'),
  BCRYPT_ROUNDS: Joi.number().default(10),
  REDIS_URL: Joi.string().optional(),
  SETUP_SECRET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Required only in production for initial setup'),
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_SUCCESS_URL: Joi.string().uri().optional(),
  STRIPE_CANCEL_URL: Joi.string().uri().optional(),
  BINANCE_API_KEY: Joi.string().optional(),
  BINANCE_SECRET_KEY: Joi.string().optional(),
  BINANCE_SUCCESS_URL: Joi.string().uri().optional(),
  BINANCE_CANCEL_URL: Joi.string().uri().optional(),
});

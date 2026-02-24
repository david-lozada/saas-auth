import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PagoMovilConfigDocument = PagoMovilConfig & Document;

@Schema({ timestamps: true })
export class PagoMovilConfig {
  @Prop({ required: true, unique: true })
  tenantId: string;

  @Prop({ default: false })
  enabled: boolean;

  @Prop({ required: true })
  phoneNumber: string; // Tenant's receiving number

  @Prop({ required: true })
  bankCode: string;

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  idNumber: string; // RIF/CI of account holder

  @Prop({ required: true })
  accountHolder: string; // Name of account holder

  @Prop({ default: true })
  requireScreenshot: boolean;

  @Prop({ default: 24 })
  verificationHours: number; // Hours to verify

  @Prop()
  exchangeRate: number; // VES per USD (manual update or API)

  @Prop({ default: 0 })
  minAmountUSD: number;

  @Prop({ default: 1000 })
  maxAmountUSD: number;
}

export const PagoMovilConfigSchema =
  SchemaFactory.createForClass(PagoMovilConfig);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @ApiProperty({ description: 'The unique name of the plan' })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({ description: 'The display label of the plan' })
  @Prop({ required: true })
  label: string;

  @ApiProperty({ description: 'Short description of the plan' })
  @Prop()
  description: string;

  @ApiProperty({
    description: 'The price index/ID from payment provider (like Stripe)',
  })
  @Prop()
  priceId: string;

  @ApiProperty({
    description: 'The amount in smallest currency unit (e.g., cents)',
  })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  @Prop({ default: 'usd' })
  currency: string;

  @ApiProperty({ description: 'Billing interval' })
  @Prop({ enum: ['month', 'year', 'lifetime'], default: 'month' })
  interval: string;

  @ApiProperty({ description: 'List of features included' })
  @Prop([String])
  features: string[];

  @ApiProperty({ description: 'Custom limits (e.g., { maxUsers: 10 })' })
  @Prop({ type: Object, default: {} })
  metadata: {
    maxUsers?: number;
    maxDevices?: number;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Whether the plan is currently available' })
  @Prop({ default: true })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

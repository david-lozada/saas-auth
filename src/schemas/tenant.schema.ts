import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Plan } from './plan.schema';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @ApiProperty({ description: 'The name of the tenant' })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({ description: 'The slug of the tenant' })
  @Prop({ required: true, unique: true })
  slug: string;

  @ApiProperty({ description: 'Whether the tenant is active' })
  @Prop({ required: true, default: true })
  isActive: boolean;

  @ApiProperty({ description: 'The current plan of the tenant' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan' })
  plan: Plan | string;

  @ApiProperty({ description: 'Subscription details' })
  @Prop({
    type: {
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'trialing', 'incomplete'],
        default: 'trialing',
      },
      currentPeriodEnd: Date,
      customerId: String,
      subscriptionId: String,
      cancelAtPeriodEnd: Boolean,
    },
    default: { status: 'trialing' },
  })
  subscription: {
    status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
    currentPeriodEnd?: Date;
    customerId?: string;
    subscriptionId?: string;
    cancelAtPeriodEnd?: boolean;
  };

  @ApiProperty({ description: 'The settings of the tenant' })
  @Prop({ type: Object, default: {} })
  settings: {
    logoUrl?: string;
    themeColor?: string;
    allowedDomains?: string[];
    requireInvite?: boolean;
    isSystemTenant?: boolean;
    allowPublicSignup?: boolean;
  };

  @ApiProperty({ description: 'The date the tenant was created' })
  @ApiHideProperty()
  @Prop()
  createdAt: Date;

  @ApiProperty({ description: 'The date the tenant was last updated' })
  @ApiHideProperty()
  @Prop()
  updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

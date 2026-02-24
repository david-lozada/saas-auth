import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PagoMovilTransactionDocument = PagoMovilTransaction & Document;

export enum PagoMovilStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class PagoMovilTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  planId: string;

  @Prop({ required: true })
  amount: number; // In VES (Bolívares)

  @Prop({ required: true })
  amountUSD: number; // Equivalent in USD for records

  @Prop({ required: true })
  phoneNumber: string; // User's phone number (04XX-XXXXXXX)

  @Prop({ required: true })
  bankCode: string; // Bank code (0102, 0105, etc.)

  @Prop({ required: true })
  referenceNumber: string; // Transaction reference

  @Prop({
    required: true,
    enum: PagoMovilStatus,
    default: PagoMovilStatus.PENDING,
  })
  status: PagoMovilStatus;

  @Prop()
  paymentDate: Date; // When user claims they paid

  @Prop()
  screenshotUrl: string; // S3/Cloudinary URL of payment proof

  @Prop()
  adminNotes: string; // Review notes

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy: string; // Admin who approved/rejected

  @Prop()
  reviewedAt: Date;

  @Prop()
  rejectionReason: string;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscriptionId: string; // Linked subscription

  @Prop({ default: 0 })
  attemptCount: number; // For tracking retries

  @Prop()
  expiresAt: Date; // 24h to submit proof
}

export const PagoMovilTransactionSchema =
  SchemaFactory.createForClass(PagoMovilTransaction);

// Indexes
PagoMovilTransactionSchema.index({ status: 1, createdAt: -1 });
PagoMovilTransactionSchema.index({ referenceNumber: 1, bankCode: 1 });
PagoMovilTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-cleanup

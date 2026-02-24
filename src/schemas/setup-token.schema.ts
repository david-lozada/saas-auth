// src/schemas/setup-token.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SetupTokenDocument = SetupToken & Document;

@Schema({ timestamps: true })
export class SetupToken {
  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  usedAt?: Date;
}

export const SetupTokenSchema = SchemaFactory.createForClass(SetupToken);

// Auto-expire documents 1 hour after they expire (cleanup)
SetupTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
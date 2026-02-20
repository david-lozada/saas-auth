import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Role, ROLES } from 'src/common/constants/roles';

export type InviteDocument = Invite & Document;

@Schema({ timestamps: true })
export class Invite {
    @ApiProperty({ description: 'The code of the invitee' })   
    @Prop({ required: true, unique: true, index: true })
    code: string;

    @ApiProperty({ description: 'The email of the invitee' })
    @Prop({ required: true })
    email: string;

    @ApiProperty({ description: 'The ID of the tenant the invitee is invited to' })
    @Prop({ required: true })
    tenantId: string;

    @ApiProperty({ description: 'The role of the invited user' })
    @Prop({ type: [String], default: [ROLES.USER] })
    role: Role[];

    @ApiProperty({ description: 'The ID of the user who created the invite' })
    @Prop({ required: true })
    invitedBy: string;

    @ApiProperty({ description: 'The expiration date of the invite' })
    @Prop({ required: true, default: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }) // Default to 7 days
    expiresAt: Date;

    @ApiProperty({ description: 'Whether the invite has been used' })
    @Prop({ default: false })
    used: boolean;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
InviteSchema.index({ email: 1, tenantId: 1 }, { unique: true });
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
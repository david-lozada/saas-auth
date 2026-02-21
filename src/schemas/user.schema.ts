import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Role, ROLE_VALUES, ROLES } from "../common/constants/roles";

export type UserDocument = User & Document;

@Schema({ timestamps: true})
export class User {
    @ApiProperty({ description: 'The email of the user', example: 'john.doe@example.com' })
    @Prop({required: true, lowercase: true, unique: true})
    email: string;

    @ApiProperty({ description: 'The password  of the user', example: 'password123'})
    @Prop({required: true})
    password: string;

    @ApiProperty({ description: 'The tenantId of the user', example: 'tenant-123'})
    @Prop({required: true, index: true})
    tenantId: string;

    @ApiProperty({ description: 'The profile of the user', example: { firstName: 'John', lastName: 'Doe' }})
    @Prop({ type: Object, required: false})
    profile: {
        firstName: string;
        lastName: string;
    };

    @Prop({ type: Object, required: false })
    metadata: {
        isFirstAdmin: boolean,
        createdVia: string,
    };

    @ApiProperty({ description: 'The roles of the user', example: ['admin', 'user']})
    @Prop({ type: [String], enum: ROLE_VALUES, default: [ROLES.USER] })
    roles: Role[];

    @ApiProperty({ description: 'The status of the user', example: true})
    @ApiHideProperty() // Hide this property
    @Prop({default: true})
    isActive: boolean;

    @ApiProperty({ description: 'The refresh token of the user', example: 'some-refresh-token'})
    @ApiHideProperty() // Hide this property
    @Prop()
    refreshToken: string;

    @ApiProperty({ description: 'The must change password flag of the user', example: true})
    @ApiHideProperty() // Hide this property
    @Prop({default: true})
    mustChangePassword: boolean;

    @ApiProperty({ description: 'The last login date of the user', example: '2024-01-01T00:00:00.000Z'})
    @ApiHideProperty() // Hide this property
    @Prop()
    lastLogin?: Date;

    @ApiProperty({ description: 'The created by userId of the user', example: 'admin-123'})
    @ApiHideProperty() // Hide this property
    @Prop({required: false})
    createdBy: string;

    @ApiProperty({ description: 'The created at date of the user', example: '2024-01-01T00:00:00.000Z'})
    @ApiHideProperty() // Hide this property
    @Prop()
    createdAt: Date;

    @ApiProperty({ description: 'The updated at date of the user', example: '2024-01-01T00:00:00.000Z'})
    @ApiHideProperty() // Hide this property
    @Prop()
    updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, roles: 1 });
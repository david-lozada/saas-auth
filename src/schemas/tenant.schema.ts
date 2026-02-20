import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true})
export class Tenant {
    @ApiProperty({ description: 'The name of the tenant' })
    @Prop({required: true, unique: true})
    name: string;

    @ApiProperty({ description: 'The slug of the tenant' })
    @Prop({required: true})
    slug: string;

    @ApiProperty({ description: 'Whether the tenant is active' })
    @Prop({required: true})
    isActive: boolean;

    @ApiProperty({ description: 'The settings of the tenant' })
    @Prop({ type: Object, default: {} })
    settings: {
        logoUrl?: string;
        themeColor?: string;
        allowedDomains?: string[];
        requireInvite?: boolean;
    };

    @ApiProperty({ description: 'The date the tenant was created' })
    @ApiHideProperty() // Hide this property
    @Prop()
    createdAt: Date;

    @ApiProperty({ description: 'The date the tenant was last updated' })
    @ApiHideProperty() // Hide this property
    @Prop()
    updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
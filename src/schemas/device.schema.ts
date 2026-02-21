import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import * as platforms from '../common/constants/platforms';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @ApiProperty({ description: 'The ID of the user', example: 'user-123' })
  @Prop({ required: true, index: true })
  userId: string;

  @ApiProperty({ description: 'The ID of the tenant', example: 'tenant-123' })
  @Prop({ required: true, index: true })
  tenantId: string;
  
  @ApiProperty({ description: 'The ID of the device', example: 'device-123' })
  @Prop({ required: true, index: true })
  deviceId: string;

  @ApiProperty({ description: 'The name of the device', example: 'John\'s iPhone' })
  @Prop()
  deviceName: string;

  @ApiProperty({ description: 'The platform of the device', example: 'iOS' })
  @ApiHideProperty() // Hide this property
  @Prop({type: String, enum: platforms.PLATFORM_VALUES})
  platform: platforms.Platform

  @ApiProperty({ description: 'The push notification token of the device', example: 'some-push-token' })
  @ApiHideProperty() // Hide this property
  @Prop()
  pushToken: string;

  @ApiProperty({ description: 'Whether the device is active', example: true })
  @ApiHideProperty() // Hide this property
  @Prop({default: true})
  isActive: boolean;

  @ApiProperty({ description: 'The last used date of the device', example: '2024-01-01T00:00:00.000Z' })
  @ApiHideProperty() // Hide this property
  @Prop()
  lastUsedAt: Date;

  @ApiProperty({ description: 'The last IP address of the device', example: '192.168.1. 1' })
  @ApiHideProperty() // Hide this property
  @Prop()
  lastIpAddress: string;

  @ApiProperty({ description: 'The user agent of the device', example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' })
  @ApiHideProperty() // Hide this property
  @Prop()
  userAgent: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
DeviceSchema.index({deviceId: 1, tenantId: 1}, {unique: true});
DeviceSchema.index({userId: 1, isActive: 1});

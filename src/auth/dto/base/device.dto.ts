import { IsString, IsOptional, IsIn } from "class-validator";
import * as platforms from "src/common/constants/platforms";

/**
 * SINGLE SOURCE OF TRUTH for device information
 */
export class DeviceDto {
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsIn(platforms.PLATFORM_VALUES)
  platform?: platforms.Platform;

  @IsOptional()
  @IsString()
  pushToken?: string;
}
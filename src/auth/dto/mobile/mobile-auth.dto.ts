import { IsString, IsOptional, IsIn } from "class-validator";
import * as platforms from "../../../common/constants/platforms";
import { DeviceDto } from "../base/device.dto"; 

/**
 * MOBILE DEVICE SOURCE OF TRUTH
 * Extends base DeviceDto
 */
export class MobileAuthDto extends DeviceDto {}
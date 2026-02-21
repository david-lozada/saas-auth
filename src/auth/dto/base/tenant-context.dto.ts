import { IsString } from "class-validator";

/**
 * Attached by middleware, used throughout services
 */
export class TenantContextDto {
  @IsString()
  tenantId: string;
}
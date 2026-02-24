import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

/**
 * Attached by middleware, used throughout services
 */
export class TenantContextDto {
  @IsString()
  tenantId: string;

  @IsString()
  slug: string;

  @IsBoolean()
  isSystemTenant: boolean;

  @IsOptional()
  @IsObject()
  settings?: any;
}

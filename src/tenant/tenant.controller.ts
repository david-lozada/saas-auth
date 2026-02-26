import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { TenantRepository } from './repositories/tenant.repository';
import { Public } from '../auth/decorators/public.decorator';

@Controller('tenants')
export class TenantController {
  constructor(private tenantRepository: TenantRepository) {}

  @Public()
  @Get('verify/:slug')
  async verifyTenant(@Param('slug') slug: string) {
    const tenant = await this.tenantRepository.findBySlugLean(
      slug.toLowerCase().trim(),
    );

    if (!tenant) throw new NotFoundException('Organization not found');

    return {
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.settings?.logoUrl,
      themeColor: tenant.settings?.themeColor,
      requireInvite: tenant.settings?.requireInvite || false,
    };
  }

  @Public()
  @Get('detect')
  async detectByDomain(@Query('domain') domain: string) {
    if (!domain) throw new BadRequestException('Domain required');

    const tenant = await this.tenantRepository.findByDomainLean(
      domain.toLowerCase(),
    );

    if (!tenant) throw new NotFoundException('Unknown domain');

    return { slug: tenant.slug, name: tenant.name };
  }
}

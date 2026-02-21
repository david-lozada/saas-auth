import { Controller, Get, Param, NotFoundException, Query, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { Public } from "../auth/decorators/public.decorator";

@Controller("tenants")
export class TenantController {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  @Public()
  @Get("verify/:slug")
  async verifyTenant(@Param("slug") slug: string) {
    const tenant = await this.tenantModel.findOne({
      slug: slug.toLowerCase().trim(),
      isActive: true,
    });

    if (!tenant) throw new NotFoundException("Organization not found");

    return {
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.settings?.logoUrl,
      themeColor: tenant.settings?.themeColor,
      requireInvite: tenant.settings?.requireInvite || false,
    };
  }

  @Public()
  @Get("detect")
  async detectByDomain(@Query("domain") domain: string) {
    if (!domain) throw new BadRequestException("Domain required");

    const tenant = await this.tenantModel.findOne({
      isActive: true,
      "settings.allowedDomains": domain.toLowerCase(),
    });

    if (!tenant) throw new NotFoundException("Unknown domain");

    return { slug: tenant.slug, name: tenant.name };
  }
}
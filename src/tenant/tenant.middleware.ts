// tenant.middleware.ts
import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TenantRepository } from './repositories/tenant.repository';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private tenantRepository: TenantRepository) {}

  async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    let tenantId: string | undefined;

    // Skip tenant check for discovery endpoints
    const publicPaths = ['/tenants/verify', '/tenants/detect'];
    if (publicPaths.some((path) => req.url.startsWith(path))) {
      return next();
    }

    // Header (mobile/web API)
    const headerTenant = (req.headers as any)['x-tenant-id'] as string;
    if (headerTenant) tenantId = headerTenant;

    // Query param
    if (!tenantId && (req.query as any).tenant) {
      tenantId = (req.query as any).tenant as string;
    }

    // Subdomain (web)
    if (!tenantId && (req.headers as any).host) {
      const host = (req.headers as any).host;
      const subdomain = host.split('.')[0];
      const reserved = ['www', 'localhost', '127', 'api', 'app'];
      if (
        subdomain &&
        !reserved.includes(subdomain) &&
        !subdomain.includes('localhost')
      ) {
        tenantId = subdomain;
      }
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant ID required');
    }

    const normalizedTenantId = tenantId.toLowerCase().trim();

    // ⭐ Handle system tenant for super admins
    if (normalizedTenantId === 'system') {
      (req as any).tenantContext = {
        tenantId: 'system',
        isSystemTenant: true,
        slug: 'system',
      };
      return next();
    }

    // Verify regular tenant exists
    const tenant =
      await this.tenantRepository.findByIdOrSlugLean(normalizedTenantId);

    if (!tenant) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    (req as any).tenantContext = {
      tenantId: (tenant as any)._id.toString(),
      slug: tenant.slug,
      settings: tenant.settings || {},
      isSystemTenant: false,
    };

    next();
  }
}

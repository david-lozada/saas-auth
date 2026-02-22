import { Injectable, NestMiddleware, BadRequestException } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    let tenantId: string | undefined;

    // Header (mobile/web API)
    const headerTenant = (req.headers as any)["x-tenant-id"] as string;
    if (headerTenant) tenantId = headerTenant;

    // Query param
    if (!tenantId && (req.query as any).tenant) {
      tenantId = (req.query as any).tenant as string;
    }

    // Subdomain (web)
    if (!tenantId && (req.headers as any).host) {
      const host = (req.headers as any).host;
      const subdomain = host.split(".")[0];
      const reserved = ["www", "localhost", "127", "api", "app"];
      if (subdomain && !reserved.includes(subdomain) && !subdomain.includes("localhost")) {
        tenantId = subdomain;
      }
    }

    if (!tenantId) {
      throw new BadRequestException("Tenant ID required");
    }

    (req as any)["tenantId"] = tenantId.toLowerCase().trim();
    next();
  }
}
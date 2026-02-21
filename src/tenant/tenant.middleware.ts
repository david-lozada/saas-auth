import { Injectable, NestMiddleware, BadRequestException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | undefined;

    // Header (mobile/web API)
    const headerTenant = req.headers["x-tenant-id"] as string;
    if (headerTenant) tenantId = headerTenant;

    // Query param
    if (!tenantId && req.query.tenant) {
      tenantId = req.query.tenant as string;
    }

    // Subdomain (web)
    if (!tenantId && req.headers.host) {
      const host = req.headers.host;
      const subdomain = host.split(".")[0];
      const reserved = ["www", "localhost", "127", "api", "app"];
      if (subdomain && !reserved.includes(subdomain) && !subdomain.includes("localhost")) {
        tenantId = subdomain;
      }
    }

    if (!tenantId) {
      throw new BadRequestException("Tenant ID required");
    }

    req["tenantId"] = tenantId.toLowerCase().trim();
    next();
  }
}
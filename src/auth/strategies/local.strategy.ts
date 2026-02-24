// local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { TenantContextDto } from '../dto';

interface RequestWithTenant {
  tenantContext?: TenantContextDto;
  headers: Record<string, string | string[] | undefined>;
  raw?: {
    headers: Record<string, string | string[] | undefined>;
  };
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: RequestWithTenant, email: string, password: string) {
    let tenantContext = req.tenantContext;

    // 🛡️ Fallback: If middleware didn't run or context lost
    if (!tenantContext) {
      const headerValue =
        req.headers['x-tenant-id'] || req.raw?.headers['x-tenant-id'];
      const headerTenant = Array.isArray(headerValue)
        ? headerValue[0]
        : headerValue;

      if (headerTenant?.toLowerCase() === 'system') {
        tenantContext = {
          tenantId: 'system',
          isSystemTenant: true,
          slug: 'system',
        };
        req.tenantContext = tenantContext;
      }
    }

    if (!tenantContext?.tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    // ⭐ Handle system tenant login (super admin)
    if (tenantContext.isSystemTenant) {
      const user = await this.authService.validateSuperAdminCredentials({
        email,
        password,
      });

      if (!user) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }

      return user;
    }

    // Regular tenant user login
    const user = await this.authService.validateCredentials(
      tenantContext.tenantId,
      {
        email,
        password,
      },
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}

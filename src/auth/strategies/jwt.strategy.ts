import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TenantContextDto } from '../dto';

interface RequestWithTenant {
  tenantContext?: TenantContextDto;
  headers: Record<string, string | string[] | undefined>;
  raw?: {
    headers: Record<string, string | string[] | undefined>;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtConfig = configService.getOrThrow('jwt');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
      passReqToCallback: true,
    });
  }

  // Use 'any' instead of FastifyRequest to avoid emitDecoratorMetadata error
  async validate(req: RequestWithTenant, payload: any) {
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

    if (!tenantContext) {
      throw new UnauthorizedException('Tenant context missing');
    }

    // Super admin token
    if (payload.tenantId === 'system' && payload.isSuperAdmin) {
      if (tenantContext.tenantId !== 'system') {
        throw new UnauthorizedException(
          'Super admin token requires system tenant',
        );
      }
      return {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
        isSuperAdmin: true,
        tenantId: 'system',
      };
    }

    // Regular user
    if (payload.tenantId !== tenantContext.tenantId) {
      throw new UnauthorizedException('Invalid token for this tenant');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
    };
  }
}

// tenant-context.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<any>();
    return request.tenantContext;
  },
);
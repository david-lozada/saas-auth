import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/guards/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateUserDto, InviteUserDto } from './dto';
import { TenantContext } from '../auth/decorators/tenant-context.decorator';
import { TenantContextDto } from '../auth/dto';

// Extend FastifyRequest to include user
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('users')
  @Roles('admin')
  async createUser(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() dto: CreateUserDto,
  ) {
    return this.adminService.createUser(context, user.userId, dto);
  }

  @Get('users')
  @Roles('admin')
  async listUsers(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return this.adminService.listUsers(context, user.userId);
  }

  @Get('users/:id')
  @Roles('admin')
  async getUserDetails(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
  ) {
    return this.adminService.getUserDetails(context, user.userId, userId);
  }

  @Patch('users/:id/roles')
  @Roles('admin')
  async updateUserRoles(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
    @Body('roles') roles: string[],
  ) {
    return this.adminService.updateUserRoles(
      context,
      user.userId,
      userId,
      roles,
    );
  }

  @Post('users/:id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deactivateUser(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
  ) {
    return this.adminService.deactivateUser(context, user.userId, userId);
  }

  @Post('users/:id/reactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
  ) {
    return this.adminService.reactivateUser(context, user.userId, userId);
  }

  @Post('invites')
  @Roles('admin')
  async inviteUser(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() dto: InviteUserDto,
  ) {
    return this.adminService.inviteUser(context, user.userId, dto);
  }

  @Post('devices/:deviceId/revoke')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async revokeDevice(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('deviceId') deviceId: string,
  ) {
    return this.adminService.revokeDevice(context, user.userId, deviceId);
  }

  @Get('stats')
  @Roles('admin')
  async getTenantStats(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return this.adminService.getTenantStats(context, user.userId);
  }
}

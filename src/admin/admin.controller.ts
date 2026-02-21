import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/guards/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateUserDto, InviteUserDto } from './dto';
import { TenantContextDto } from '../auth/dto';

// Extend Express Request to include tenant and user
interface AuthenticatedRequest extends Request {
  tenantId: string;
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
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() dto: CreateUserDto,
  ) {
    return this.adminService.createUser(
      { tenantId: req.tenantId },
      user.userId,
      dto,
    );
  }

  @Get('users')
  @Roles('admin')
  async listUsers(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return this.adminService.listUsers({ tenantId: req.tenantId }, user.userId);
  }

  @Get('users/:id')
  @Roles('admin')
  async getUserDetails(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
  ) {
    return this.adminService.getUserDetails(
      { tenantId: req.tenantId },
      user.userId,
      userId,
    );
  }

  @Patch('users/:id/roles')
  @Roles('admin')
  async updateUserRoles(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
    @Body('roles') roles: string[],
  ) {
    return this.adminService.updateUserRoles(
      { tenantId: req.tenantId },
      user.userId,
      userId,
      roles,
    );
  }

  @Post('users/:id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deactivateUser(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
  ) {
    return this.adminService.deactivateUser(
      { tenantId: req.tenantId },
      user.userId,
      userId,
    );
  }

  @Post('users/:id/reactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') userId: string,
  ) {
    return this.adminService.reactivateUser(
      { tenantId: req.tenantId },
      user.userId,
      userId,
    );
  }

  @Post('invites')
  @Roles('admin')
  async inviteUser(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() dto: InviteUserDto,
  ) {
    return this.adminService.inviteUser(
      { tenantId: req.tenantId },
      user.userId,
      dto,
    );
  }

  @Post('devices/:deviceId/revoke')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async revokeDevice(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('deviceId') deviceId: string,
  ) {
    return this.adminService.revokeDevice(
      { tenantId: req.tenantId },
      user.userId,
      deviceId,
    );
  }

  @Get('stats')
  @Roles('admin')
  async getTenantStats(
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return this.adminService.getTenantStats(
      { tenantId: req.tenantId },
      user.userId,
    );
  }
}
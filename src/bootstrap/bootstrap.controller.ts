// src/bootstrap/bootstrap.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { CreateFirstAdminDto } from './dto/create-first-admin.dto';


@Controller('bootstrap')
export class BootstrapController {
  private readonly logger = new Logger(BootstrapController.name);

  constructor(private readonly bootstrapService: BootstrapService) {}

  /**
   * Check if system requires setup (public endpoint)
   */
  @Get('status')
  async getStatus(): Promise<{ requiresSetup: boolean }> {
    return {
      requiresSetup: await this.bootstrapService.requiresSetup(),
    };
  }

  /**
   * Create first admin (only works with valid setup token)
   */
  @Post('setup')
  async createFirstAdmin(@Body() dto: CreateFirstAdminDto) {
    try {
      const result = await this.bootstrapService.createFirstAdmin(dto);

      return {
        success: true,
        message: 'System initialized successfully',
        user: {
          email: result.user.email,
          roles: result.user.roles,
        },
        tenant: {
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
        nextSteps: [
          'Login at POST /auth/web/login',
          'Create tenants via POST /admin/tenants',
          'Invite users via POST /admin/invites',
        ],
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException('System already initialized');
      }
      this.logger.error('Bootstrap failed:', error.message);
      throw new BadRequestException('Invalid setup token or data');
    }
  }
}
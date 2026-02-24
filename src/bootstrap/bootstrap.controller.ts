// src/bootstrap/bootstrap.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
  GoneException,
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
   * Generate single-use setup token
   */
  @Get('token')
  async generateToken(): Promise<{ token: string; expiresAt: Date; warning: string }> {
    try {
      const result = await this.bootstrapService.generateSetupToken();
      return {
        ...result,
        warning: 'This token can only be used ONCE. Save it securely.',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException('System already initialized');
      }
      throw error;
    }
  }

  /**
   * Create first admin (consumes token - single use!)
   */
  @Post('setup')
  async createFirstAdmin(@Body() dto: CreateFirstAdminDto) {
    try {
      const result = await this.bootstrapService.createFirstAdmin(dto);

      return {
        success: true,
        message: 'System initialized successfully. Token consumed.',
        user: {
          id: result.user._id,
          email: result.user.email,
          roles: result.user.roles,
        },
        warning: 'This setup token has been permanently invalidated.',
        nextSteps: [
          'Login: POST /auth/super-admin/login with x-tenant-id: system',
          'Create tenants: POST /admin/tenants',
          'Invite users: POST /admin/invites',
        ],
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException('System already initialized');
      }
      if (error instanceof GoneException) {
        throw new GoneException('Token already used. Generate a new token at GET /bootstrap/token');
      }
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Invalid or expired setup token');
      }
      this.logger.error('Bootstrap failed:', error.message);
      throw new BadRequestException('Failed to create admin');
    }
  }
}
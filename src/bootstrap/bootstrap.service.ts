// src/bootstrap/bootstrap.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from '../schemas/user.schema';
import { Tenant } from '../schemas/tenant.schema';
import { ConfigService } from '@nestjs/config';
import { CreateFirstAdminDto } from './dto/create-first-admin.dto';
import { ROLES } from '../common/constants/roles';

export interface BootstrapToken {
  token: string;
  expiresAt: Date;
  setupUrl: string;
}

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);
  private setupToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    private configService: ConfigService,
  ) {
  }

  /**
   * Check if system requires initial setup (no users exist)
   */
  async requiresSetup(): Promise<boolean> {
    const userCount = await this.userModel.countDocuments();
    return userCount === 0;
  }

  /**
   * Generate one-time setup token for first admin creation
   * Only works if no users exist in system
   */
  async generateSetupToken(): Promise<BootstrapToken> {
    // Verify system is in setup mode
    if (!(await this.requiresSetup())) {
      throw new ConflictException(
        'System already initialized. Use admin panel to create users.',
      );
    }

    // Generate cryptographically secure token
    this.setupToken = crypto.randomBytes(32).toString('hex');
    this.tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    const port = this.configService.get('PORT', 3000);
    const setupUrl = `http://localhost:${port}/bootstrap/setup?token=${this.setupToken}`;

    this.logger.log('');
    this.logger.log('=================================================');
    this.logger.log('🔑 SETUP TOKEN GENERATED');
    this.logger.log(`⏱️  Valid until: ${this.tokenExpiresAt.toISOString()}`);
    this.logger.log('');
    this.logger.log('📋 Setup URL:');
    this.logger.log(setupUrl);
    this.logger.log('');
    this.logger.log('💡 Or use this token in API call:');
    this.logger.log(`Token: ${this.setupToken}`);
    this.logger.log('=================================================');

    return {
      token: this.setupToken,
      expiresAt: this.tokenExpiresAt,
      setupUrl,
    };
  }

  /**
   * Validate setup token
   */
  validateSetupToken(token: string): boolean {
    if (!this.setupToken || !this.tokenExpiresAt) {
      return false;
    }
    if (new Date() > this.tokenExpiresAt) {
      this.setupToken = null;
      return false;
    }
    // Timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(this.setupToken, 'hex'),
      );
    } catch {
      // Buffer length mismatch or other error
      return false;
    }
  }

  /**
   * Create first superadmin with system tenant
   */
  async createFirstAdmin(adminData: CreateFirstAdminDto): Promise<{ user: User; tenant: Tenant }> {
    // Validate token first
    if (!this.validateSetupToken(adminData.setupToken)) {
      throw new Error('Invalid or expired setup token');
    }

    // Double-check no users exist (race condition protection)
    if (!(await this.requiresSetup())) {
      throw new ConflictException('System already initialized');
    }

    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      // 1. Create system tenant first
      const systemTenant = await this.tenantModel.create(
        [
          {
            name: 'System Administration',
            slug: 'system',
            isActive: true,
            settings: {
              isSystemTenant: true,
              allowPublicSignup: false,
              requireInvite: true,
            },
          },
        ],
        { session },
      );

      // 2. Hash password
      const bcryptRounds = this.configService.getOrThrow<number>(
        'security.bcryptRounds',
      );
      const passwordHash = await bcrypt.hash(adminData.password, bcryptRounds);

      // 3. Create superadmin user
      const [adminUser] = await this.userModel.create(
        [
          {
            email: adminData.email.toLowerCase().trim(),
            password: passwordHash,
            tenantId: systemTenant[0]._id.toString(),
            roles: [ROLES.SUPERADMIN],
            isActive: true,
            mustChangePassword: false,
            profile: {
              firstName: adminData.firstName,
              lastName: adminData.lastName,
            },
            metadata: {
              isFirstAdmin: true,
              createdVia: 'bootstrap',
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();

      // Invalidate token immediately after use (one-time use)
      this.setupToken = null;
      this.tokenExpiresAt = null;

      this.logger.log(`✅ First admin created: ${adminUser.email} (Tenant: ${systemTenant[0].slug})`);

      return {
        user: adminUser,
        tenant: systemTenant[0],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
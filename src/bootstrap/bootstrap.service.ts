// src/bootstrap/bootstrap.service.ts
import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  GoneException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { CreateFirstAdminDto } from './dto/create-first-admin.dto';
import { ROLES } from '../common/constants/roles';
import { UserRepository } from '../auth/repositories/user.repository';
import { SetupTokenRepository } from './repositories/setup-token.repository';

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private userRepository: UserRepository,
    private setupTokenRepository: SetupTokenRepository,
    private configService: ConfigService,
  ) {}

  /**
   * Check if system requires initial setup (no super admins exist)
   */
  async requiresSetup(): Promise<boolean> {
    const superAdmins = await this.userRepository.find({
      roles: { $in: [ROLES.SUPERADMIN] },
    });
    return superAdmins.length === 0;
  }

  /**
   * Generate single-use setup token
   */
  async generateSetupToken(): Promise<{ token: string; expiresAt: Date }> {
    if (!(await this.requiresSetup())) {
      throw new ConflictException(
        'System already initialized. Use admin panel to create users.',
      );
    }

    // Clean up any existing unused tokens
    await this.setupTokenRepository.deleteMany({ used: false });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    await this.setupTokenRepository.create({
      tokenHash,
      expiresAt,
      used: false,
    });

    const port = this.configService.get('PORT', 3000);

    this.logger.log('');
    this.logger.log('=================================================');
    this.logger.log('🔑 SINGLE-USE SETUP TOKEN GENERATED');
    this.logger.log(`⏱️  Valid until: ${expiresAt.toISOString()}`);
    this.logger.log('⚠️  This token can only be used ONCE');
    this.logger.log('=================================================');

    return { token: rawToken, expiresAt };
  }

  /**
   * Validate and consume setup token (atomic operation)
   */
  private async consumeSetupToken(rawToken: string): Promise<boolean> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const tokenDoc = await this.setupTokenRepository.findOneAndUpdate(
      {
        tokenHash,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { used: true, usedAt: new Date() },
      },
    );

    if (!tokenDoc) {
      const usedToken = await this.setupTokenRepository.findOne({
        tokenHash,
        used: true,
      });
      if (usedToken) {
        this.logger.warn(
          `Attempt to reuse setup token at ${new Date().toISOString()}`,
        );
        throw new GoneException('Token already used. Generate a new token.');
      }
      return false;
    }

    return true;
  }

  /**
   * Create first super admin - NO TENANT, global scope
   */
  async createFirstAdmin(
    dto: CreateFirstAdminDto,
  ): Promise<{ user: UserDocument }> {
    // Validate and consume token (single-use)
    const isValid = await this.consumeSetupToken(dto.setupToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid setup token');
    }

    // Double-check no super admins exist
    if (!(await this.requiresSetup())) {
      throw new ConflictException('System already initialized');
    }

    // Get access to model for session/transaction
    // @ts-ignore - reaching into protected model for transactions
    const model = this.userRepository.entityModel;
    const session = await model.db.startSession();
    session.startTransaction();

    try {
      const bcryptRounds = this.configService.getOrThrow<number>(
        'security.bcryptRounds',
      );
      const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

      // ⭐ Create super admin WITHOUT tenantId (global admin)
      const [adminUser] = await model.create(
        [
          {
            email: dto.email.toLowerCase().trim(),
            password: passwordHash,
            // ⭐ NO tenantId field - super admins are global!
            roles: [ROLES.SUPERADMIN],
            isActive: true,
            mustChangePassword: false,
            profile: {
              firstName: dto.firstName,
              lastName: dto.lastName,
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

      this.logger.log(`✅ First super admin created: ${adminUser.email}`);
      this.logger.log('🔒 Setup token consumed and invalidated');

      return { user: adminUser }; // ⭐ Only user, no tenant
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

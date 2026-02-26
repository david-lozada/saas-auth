import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { UserRepository } from './repositories/user.repository';
import { InviteRepository } from './repositories/invite.repository';
import { DeviceRepository } from './repositories/device.repository';
import { TenantRepository } from '../tenant/repositories/tenant.repository';
import {
  CredentialsDto,
  DeviceDto,
  TenantContextDto,
  WebSignupDto,
  MobileSignupDto,
  WebLoginDto,
  MobileLoginDto,
} from './dto';
import { Role, ROLES } from '../common/constants/roles';
import { ConfigService } from '@nestjs/config';
import { JwtConfig, SecurityConfig } from '../config/config.types';
import { User, UserDocument } from '../schemas/user.schema';
import { DeviceDocument } from '../schemas/device.schema';
import { InviteDocument } from '../schemas/invite.schema';
import { TenantDocument } from '../schemas/tenant.schema';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private inviteRepository: InviteRepository,
    private deviceRepository: DeviceRepository,
    private tenantRepository: TenantRepository,
    private jwtService: JwtService,
    private configService: ConfigService<{
      jwt: JwtConfig;
      security: SecurityConfig;
    }>,
  ) {}

  // ============================================
  // REGISTRATION
  // ============================================
  async webSignup(context: TenantContextDto, dto: WebSignupDto) {
    if (context.isSystemTenant || context.tenantId === 'system') {
      throw new UnauthorizedException(
        'Cannot sign up users to the system tenant',
      );
    }
    const tenant = await this.validateTenant(context.tenantId);

    if (tenant.settings.requireInvite && !dto.inviteCode) {
      throw new UnauthorizedException(
        'An invite code is required to sign up for this tenant',
      );
    }

    if (dto.inviteCode) {
      await this.validateInvite(context.tenantId, dto.email, dto.inviteCode);
    }

    const user = await this.createUser({
      tenantId: context.tenantId,
      credentials: dto,
      roles: [ROLES.USER],
    });
    const fullUser = await this.getUserOrThrow(user.id);
    const tokens = await this.generateTokens(fullUser as UserDocument, 'web');
    return { user, ...tokens };
  }

  async mobileSignup(context: TenantContextDto, dto: MobileSignupDto) {
    if (context.isSystemTenant || context.tenantId === 'system') {
      throw new UnauthorizedException(
        'Cannot sign up users to the system tenant',
      );
    }
    const tenant = await this.validateTenant(context.tenantId);

    if (tenant.settings.requireInvite && !dto.inviteCode) {
      throw new UnauthorizedException(
        'An invite code is required to sign up for this tenant',
      );
    }
    if (dto.inviteCode) {
      await this.validateInvite(context.tenantId, dto.email, dto.inviteCode);
    }

    const user = await this.createUser({
      tenantId: context.tenantId,
      credentials: dto,
      roles: [ROLES.USER],
    });
    await this.upsertDevice({
      userId: user.id,
      tenantId: context.tenantId,
      device: dto,
    });
    const fullUser = await this.getUserOrThrow(user.id);
    const tokens = await this.generateTokens(
      fullUser as UserDocument,
      'mobile',
    );
    return { user, ...tokens };
  }

  // ============================================
  // LOGIN
  // ============================================

  async webLogin(context: TenantContextDto, user: UserDocument) {
    await this.updateLastLogin(user._id.toString());
    const fullUser = await this.getUserOrThrow(user._id.toString());
    return this.generateTokens(fullUser, 'web');
  }

  async mobileLogin(
    context: TenantContextDto,
    user: UserDocument,
    dto: MobileLoginDto,
  ) {
    await this.upsertDevice({
      userId: user._id.toString(),
      tenantId: context.tenantId,
      device: dto,
    });
    await this.updateLastLogin(user._id.toString());
    const fullUser = await this.getUserOrThrow(user._id.toString());
    return this.generateTokens(fullUser, 'mobile');
  }

  async superAdminLogin(context: TenantContextDto, user: UserDocument) {
    if (!context.isSystemTenant) {
      throw new UnauthorizedException(
        'Super admin login requires system tenant context',
      );
    }
    await this.updateLastLogin(user._id.toString());
    const fullUser = await this.getUserOrThrow(user._id.toString());
    return this.generateTokens(fullUser, 'web', true);
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  async refreshToken(
    context: TenantContextDto,
    refreshToken: string,
    device?: DeviceDto,
  ) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<JwtConfig>('jwt', { infer: true })!
          .refreshSecret,
      });

      const isSuperAdmin =
        payload.tenantId === 'system' && payload.isSuperAdmin;

      if (payload.tenantId !== context.tenantId) {
        throw new UnauthorizedException(
          'Invalid tenant context for this token',
        );
      }

      if (device?.deviceId) {
        const deviceRecord = await this.deviceRepository.findActiveDevice(
          device.deviceId,
          context.tenantId,
        );
        if (!deviceRecord) {
          throw new UnauthorizedException('Device deactivated or not found');
        }
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user?.refreshToken)
        throw new UnauthorizedException('Session expired, please log in again');

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        await this.userRepository.updateRefreshToken(user._id.toString(), null);
        await this.deviceRepository.deactivateUserDevices(user._id.toString());
        throw new UnauthorizedException(
          'Security violation detected. All sessions have been revoked. Please log in again.',
        );
      }
      if (device?.deviceId) {
        await this.deviceRepository.upsertDevice(
          user._id.toString(),
          context.tenantId,
          device,
        );
      }

      return this.generateTokens(
        user,
        device?.deviceId ? 'mobile' : 'web',
        isSuperAdmin,
      );
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          'Refresh token expired, please log in again',
        );
      }
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout(
    context: TenantContextDto,
    userId: string,
    device?: Pick<DeviceDocument, 'deviceId'>,
  ) {
    if (device?.deviceId) {
      await this.deviceRepository.findOneAndUpdate(
        { deviceId: device.deviceId, tenantId: context.tenantId, userId },
        { isActive: false },
      );
      const activeDevices = await this.deviceRepository.countActiveDevices(
        userId,
        context.tenantId,
      );
      if (activeDevices === 0) {
        await this.userRepository.updateRefreshToken(userId, null);
      }
    } else {
      await this.userRepository.findOneAndUpdate(
        { _id: userId, tenantId: context.tenantId },
        { refreshToken: null },
      );
    }
  }

  async logoutAllDevices(tenantId: string, userId: string) {
    await this.deviceRepository.deactivateUserDevices(userId, tenantId);
    await this.userRepository.updateRefreshToken(userId, null);
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async getProfile(tenantId: string, userId: string) {
    const user = await this.userRepository.findByTenantId(tenantId, userId);

    if (!user) throw new UnauthorizedException('User not found');
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    return userObj;
  }

  async getUserDevices(tenantId: string, userId: string) {
    return this.deviceRepository
      .find({ userId, tenantId }, { pushToken: 0 })
      .then((devices) =>
        devices.sort(
          (a: any, b: any) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime(),
        ),
      );
  }

  async changePassword(
    tenantId: string,
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findByTenantId(tenantId, userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.findOneAndUpdate(
      { _id: userId },
      {
        password: hashedPassword,
        mustChangePassword: false,
      },
    );

    await this.logoutAllDevices(tenantId, userId);

    return { message: 'Password changed. Please log in again.' };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  async validateCredentials(
    tenantId: string,
    credentials: CredentialsDto,
  ): Promise<
    Omit<User, 'password' | 'refreshToken' | 'tenantId'> & { _id: any }
  > {
    const user = await this.userRepository.findByEmail(
      credentials.email,
      tenantId,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Block super admin login on regular endpoints
    if (user.roles.includes(ROLES.SUPERADMIN)) {
      throw new UnauthorizedException(
        'Use super-admin/login for super admin accounts',
      );
    }

    const isMatch = await bcrypt.compare(credentials.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (user.mustChangePassword) {
      throw new ForbiddenException(
        'You must change your password before logging in. Please check your email for instructions.',
      );
    }
    const { tenantId: _, password, refreshToken, ...result } = user.toObject();
    return result as any;
  }

  async validateSuperAdminCredentials(
    credentials: CredentialsDto,
  ): Promise<
    Omit<User, 'password' | 'refreshToken' | 'tenantId'> & { _id: any }
  > {
    const user = await this.userRepository.findByEmail(credentials.email);

    if (!user)
      throw new UnauthorizedException('Invalid super admin credentials');

    const isMatch = await bcrypt.compare(credentials.password, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Invalid super admin credentials');

    const { tenantId: _, password, refreshToken, ...result } = user.toObject();
    return result as any;
  }

  private async validateTenant(tenantId: string): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.findBySlugLean(tenantId);
    if (!tenant)
      throw new UnauthorizedException(
        `Tenant with ID ${tenantId} not found or inactive`,
      );
    return tenant as TenantDocument;
  }

  private async validateInvite(
    tenantId: string,
    email: string,
    code: string,
  ): Promise<InviteDocument> {
    const invite = await this.inviteRepository.findValidInvite(
      tenantId,
      email,
      code,
    );
    if (!invite)
      throw new UnauthorizedException('Invalid or expired invite code');
    return invite;
  }

  private async createUser(data: {
    tenantId: string;
    credentials: CredentialsDto;
    roles: Role[];
    mustChangePassword?: boolean;
  }) {
    const { tenantId, credentials, roles, mustChangePassword } = data;
    const existing = await this.userRepository.findByEmail(
      credentials.email,
      tenantId,
    );

    if (existing) {
      throw new UnauthorizedException(
        'A user with that email already exists in this tenant',
      );
    }
    const hashedPassword = await bcrypt.hash(credentials.password, 12);
    const user = await this.userRepository.create({
      email: credentials.email.toLowerCase().trim(),
      password: hashedPassword,
      tenantId,
      roles,
      isActive: true,
      mustChangePassword: !!mustChangePassword,
    });

    return {
      id: (user as any)._id.toString(),
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(
    user: UserDocument,
    type: 'web' | 'mobile',
    isSuperAdmin: boolean = false,
  ) {
    const payload: any = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      type: 'access',
    };

    if (isSuperAdmin) {
      payload.tenantId = 'system';
      payload.isSuperAdmin = true;
    } else {
      payload.tenantId = user.tenantId;
    }

    const accessExpiry =
      type === 'mobile'
        ? this.configService.get<JwtConfig>('jwt', { infer: true })!
            .mobileAccessExpiry
        : this.configService.get<JwtConfig>('jwt', { infer: true })!
            .accessExpiry;
    const refreshExpiry =
      type === 'mobile'
        ? this.configService.get<JwtConfig>('jwt', { infer: true })!
            .mobileRefreshExpiry
        : this.configService.get<JwtConfig>('jwt', { infer: true })!
            .refreshExpiry;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<JwtConfig>('jwt', { infer: true })!
          .secret,
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: this.configService.get<JwtConfig>('jwt', { infer: true })!
            .refreshSecret,
          expiresIn: refreshExpiry,
        },
      ),
    ]);
    const refreshHash = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.updateRefreshToken(
      user._id.toString(),
      refreshHash,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: type === 'mobile' ? 7 * 24 * 60 * 60 : 15 * 60, // in seconds
      tokenType: 'Bearer',
    };
  }

  private async getUserOrThrow(userId: string): Promise<UserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async upsertDevice(data: {
    tenantId: string;
    userId: string;
    device: DeviceDto;
  }) {
    await this.deviceRepository.upsertDevice(
      data.userId,
      data.tenantId,
      data.device,
    );
  }

  private async updateLastLogin(userId: string) {
    await this.userRepository.updateLastLogin(userId);
  }
}

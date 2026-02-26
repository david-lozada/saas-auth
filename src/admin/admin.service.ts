import {
  Injectable,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ROLES } from '../common/constants/roles';
import { CreateUserDto, InviteUserDto } from './dto';
import { TenantContextDto } from '../auth/dto';
import { UserRepository } from '../auth/repositories/user.repository';
import { InviteRepository } from '../auth/repositories/invite.repository';
import { DeviceRepository } from '../auth/repositories/device.repository';

@Injectable()
export class AdminService {
  constructor(
    private userRepository: UserRepository,
    private inviteRepository: InviteRepository,
    private deviceRepository: DeviceRepository,
  ) {}

  async createUser(
    context: TenantContextDto,
    adminId: string,
    dto: CreateUserDto,
  ) {
    // Verify admin exists and is active
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    // Check if user already exists
    const existing = await this.userRepository.findByEmail(
      dto.email,
      context.tenantId,
    );

    if (existing) {
      throw new ConflictException('User already exists in this tenant');
    }

    // Generate temporary password if not provided
    const tempPassword =
      dto.tempPassword || crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      tenantId: context.tenantId,
      roles: dto.roles || [ROLES.USER],
      isActive: true,
      mustChangePassword: true,
      createdBy: adminId,
    });

    // TODO: Send email with temporary password

    return {
      id: (user as any)._id.toString(),
      email: user.email,
      roles: user.roles,
      tempPassword, // Remove in production - for testing only
      message: 'User created. Temporary password sent to email.',
    };
  }

  async inviteUser(
    context: TenantContextDto,
    adminId: string,
    dto: InviteUserDto,
  ) {
    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    // Check if user already exists
    const existing = await this.userRepository.findByEmail(
      dto.email,
      context.tenantId,
    );

    if (existing) {
      throw new ConflictException('User already exists');
    }

    // Generate unique invite code
    const code = crypto.randomBytes(32).toString('hex');

    const invite = await this.inviteRepository.create({
      code,
      email: dto.email.toLowerCase(),
      tenantId: context.tenantId,
      roles: dto.roles || [ROLES.USER],
      invitedBy: adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // TODO: Send invitation email with link:
    // https://app.yourapp.com/complete-registration?code=ABC123

    return {
      code: invite.code, // Remove in production - for testing only
      email: invite.email,
      expiresAt: invite.expiresAt,
      message: 'Invitation sent',
    };
  }

  async listUsers(context: TenantContextDto, adminId: string) {
    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    return this.userRepository.find(
      { tenantId: context.tenantId },
      { password: 0, refreshToken: 0 },
    );
  }

  async getUserDetails(
    context: TenantContextDto,
    adminId: string,
    userId: string,
  ) {
    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userRepository.findOne(
      { _id: userId, tenantId: context.tenantId },
      { password: 0, refreshToken: 0 },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get user's devices
    const devices = await this.deviceRepository.find(
      { userId, tenantId: context.tenantId },
      { pushToken: 0 },
    );

    return {
      user,
      devices,
    };
  }

  async deactivateUser(
    context: TenantContextDto,
    adminId: string,
    userId: string,
  ) {
    // Prevent self-deactivation
    if (userId === adminId) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    // Deactivate user
    const user = await this.userRepository.findOneAndUpdate(
      { _id: userId, tenantId: context.tenantId },
      { isActive: false },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Deactivate all devices
    await this.deviceRepository.deactivateUserDevices(userId, context.tenantId);

    // Invalidate refresh token
    await this.userRepository.updateRefreshToken(userId, null);

    return {
      message: 'User deactivated successfully',
      userId: user._id.toString(),
      email: user.email,
    };
  }

  async reactivateUser(
    context: TenantContextDto,
    adminId: string,
    userId: string,
  ) {
    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userRepository.findOneAndUpdate(
      { _id: userId, tenantId: context.tenantId },
      { isActive: true },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return {
      message: 'User reactivated successfully',
      user: userObj,
    };
  }

  async updateUserRoles(
    context: TenantContextDto,
    adminId: string,
    userId: string,
    roles: string[],
  ) {
    // Prevent self-demotion (ensure at least one admin remains)
    if (userId === adminId && !roles.includes(ROLES.ADMIN)) {
      const adminCount = await this.userRepository.findOne({
        tenantId: context.tenantId,
        roles: { $in: [ROLES.ADMIN] },
        isActive: true,
        _id: { $ne: adminId },
      });

      if (!adminCount) {
        throw new BadRequestException(
          'Cannot remove admin role from the only admin',
        );
      }
    }

    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userRepository.findOneAndUpdate(
      { _id: userId, tenantId: context.tenantId },
      { roles },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return {
      message: 'User roles updated',
      user: userObj,
    };
  }

  async revokeDevice(
    context: TenantContextDto,
    adminId: string,
    deviceId: string,
  ) {
    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const device = await this.deviceRepository.findOneAndUpdate(
      { deviceId, tenantId: context.tenantId },
      { isActive: false },
    );

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    // Check if user has any active devices left
    const activeDevicesCount = await this.deviceRepository.countActiveDevices(
      device.userId,
      context.tenantId,
    );

    if (activeDevicesCount === 0) {
      await this.userRepository.updateRefreshToken(device.userId, null);
    }

    return {
      message: 'Device revoked successfully',
      deviceId: device.deviceId,
      userId: device.userId,
    };
  }

  async getTenantStats(context: TenantContextDto, adminId: string) {
    // Verify admin
    const admin = await this.userRepository.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalDevices,
      activeDevices,
    ] = await Promise.all([
      this.userRepository
        .find({ tenantId: context.tenantId })
        .then((u) => u.length),
      this.userRepository
        .find({ tenantId: context.tenantId, isActive: true })
        .then((u) => u.length),
      this.userRepository
        .find({ tenantId: context.tenantId, isActive: false })
        .then((u) => u.length),
      this.deviceRepository
        .find({ tenantId: context.tenantId })
        .then((d) => d.length),
      this.deviceRepository
        .find({ tenantId: context.tenantId, isActive: true })
        .then((d) => d.length),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
      },
      devices: {
        total: totalDevices,
        active: activeDevices,
      },
    };
  }
}

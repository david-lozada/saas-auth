import { Injectable, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../schemas/user.schema';
import { Invite, InviteDocument } from '../schemas/invite.schema';
import { Device, DeviceDocument } from '../schemas/device.schema';
import { ROLES } from '../common/constants/roles';
import { CreateUserDto, InviteUserDto } from './dto';
import { TenantContextDto, CredentialsDto } from '../auth/dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
  ) {}

  async createUser(
    context: TenantContextDto,
    adminId: string,
    dto: CreateUserDto
  ) {
    // Verify admin exists and is active
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    // Check if user already exists
    const existing = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
      tenantId: context.tenantId,
    });

    if (existing) {
      throw new ConflictException('User already exists in this tenant');
    }

    // Generate temporary password if not provided
    const tempPassword = dto.tempPassword || crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await this.userModel.create({
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
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      tempPassword, // Remove in production - for testing only
      message: 'User created. Temporary password sent to email.',
    };
  }

  async inviteUser(
    context: TenantContextDto,
    adminId: string,
    dto: InviteUserDto
  ) {
    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    // Check if user already exists
    const existing = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
      tenantId: context.tenantId,
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    // Generate unique invite code
    const code = crypto.randomBytes(32).toString('hex');

    const invite = await this.inviteModel.create({
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
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    return this.userModel
      .find({ tenantId: context.tenantId })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });
  }

  async getUserDetails(
    context: TenantContextDto,
    adminId: string,
    userId: string
  ) {
    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userModel.findOne({
      _id: userId,
      tenantId: context.tenantId,
    }).select('-password -refreshToken');

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get user's devices
    const devices = await this.deviceModel
      .find({ userId, tenantId: context.tenantId })
      .select('-pushToken')
      .sort({ lastUsedAt: -1 });

    return {
      user,
      devices,
    };
  }

  async deactivateUser(
    context: TenantContextDto,
    adminId: string,
    userId: string
  ) {
    // Prevent self-deactivation
    if (userId === adminId) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    // Deactivate user
    const user = await this.userModel.findOneAndUpdate(
      { _id: userId, tenantId: context.tenantId },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Deactivate all devices
    await this.deviceModel.updateMany(
      { userId, tenantId: context.tenantId },
      { isActive: false }
    );

    // Invalidate refresh token
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: null });

    return {
      message: 'User deactivated successfully',
      userId: user._id.toString(),
      email: user.email,
    };
  }

  async reactivateUser(
    context: TenantContextDto,
    adminId: string,
    userId: string
  ) {
    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: userId, tenantId: context.tenantId },
      { isActive: true },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      message: 'User reactivated successfully',
      user,
    };
  }

  async updateUserRoles(
    context: TenantContextDto,
    adminId: string,
    userId: string,
    roles: string[]
  ) {
    // Prevent self-demotion (ensure at least one admin remains)
    if (userId === adminId && !roles.includes(ROLES.ADMIN)) {
      const adminCount = await this.userModel.countDocuments({
        tenantId: context.tenantId,
        roles: { $in: [ROLES.ADMIN] },
        isActive: true,
        _id: { $ne: adminId },
      });

      if (adminCount === 0) {
        throw new BadRequestException('Cannot remove admin role from the only admin');
      }
    }

    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: userId, tenantId: context.tenantId },
      { roles },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      message: 'User roles updated',
      user,
    };
  }

  async revokeDevice(
    context: TenantContextDto,
    adminId: string,
    deviceId: string
  ) {
    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const device = await this.deviceModel.findOneAndUpdate(
      { deviceId, tenantId: context.tenantId },
      { isActive: false },
      { new: true }
    );

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    // Check if user has any active devices left
    const activeDevices = await this.deviceModel.countDocuments({
      userId: device.userId,
      tenantId: context.tenantId,
      isActive: true,
    });

    if (activeDevices === 0) {
      await this.userModel.findByIdAndUpdate(device.userId, { refreshToken: null });
    }

    return {
      message: 'Device revoked successfully',
      deviceId: device.deviceId,
      userId: device.userId,
    };
  }

  async getTenantStats(context: TenantContextDto, adminId: string) {
    // Verify admin
    const admin = await this.userModel.findOne({
      _id: adminId,
      tenantId: context.tenantId,
      roles: { $in: [ROLES.ADMIN] },
      isActive: true,
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    const [totalUsers, activeUsers, inactiveUsers, totalDevices, activeDevices] = await Promise.all([
      this.userModel.countDocuments({ tenantId: context.tenantId }),
      this.userModel.countDocuments({ tenantId: context.tenantId, isActive: true }),
      this.userModel.countDocuments({ tenantId: context.tenantId, isActive: false }),
      this.deviceModel.countDocuments({ tenantId: context.tenantId }),
      this.deviceModel.countDocuments({ tenantId: context.tenantId, isActive: true }),
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
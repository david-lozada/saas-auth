import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import bcrypt from 'bcrypt';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Device, DeviceDocument } from 'src/schemas/device.schema';
import { Invite, InviteDocument } from 'src/schemas/invite.schema';
import { Tenant, TenantDocument } from 'src/schemas/tenant.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { TenantContextDto } from './dto/base/tenant-context.dto';
import { WebSignupDto } from './dto/web/signup.dto';
import { CredentialsDto } from './dto/base/credentials.dto';
import { Role, ROLES } from 'src/common/constants/roles';
import { create } from 'domain';
import e from 'express';
import { ConfigService } from '@nestjs/config';
import { MobileSignupDto } from './dto/mobile/mobile-signup.dto';
import { DeviceDto } from './dto/base/device.dto';
import { WebLoginDto } from './dto/web/login.dto';
import { MobileLoginDto } from './dto/mobile/mobile-login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
        @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
        private jwtService: JwtService,
        private configService: ConfigService,
) {}
    // ============================================
    // REGISTRATION
    // ============================================
    async webSignup(context: TenantContextDto, dto: WebSignupDto) {
        const tenant = await this.validateTenant(context.tenantId);

        if (tenant.settings.requireInvite && !dto.inviteCode) {
            throw new UnauthorizedException('An invite code is required to sign up for this tenant');
        }

        if (dto.inviteCode) {
            await this.validateInvite(context.tenantId, dto.email, dto.inviteCode);
        }

        const user = await this.createUser({
            tenantId: context.tenantId,
            credentials: dto,
            roles: [ROLES.USER]
        })
        const fullUser = await this.getUserOrThrow(user.id);
        const tokens = await this.generateTokens(
            fullUser as UserDocument, 
            'web'
        );
        return { user, ...tokens }
    }

    async mobileSignup(context: TenantContextDto, dto: MobileSignupDto) {
        const tenant = await this.validateTenant(context.tenantId);

        if (tenant.settings.requireInvite && !dto.inviteCode) {
            throw new UnauthorizedException('An invite code is required to sign up for this tenant');
        }
        if (dto.inviteCode) {
            await this.validateInvite(context.tenantId, dto.email, dto.inviteCode);
        }

        const user = await this.createUser({
            tenantId: context.tenantId,
            credentials: dto,
            roles: [ROLES.USER]
        })
         await this.upsertDevice({
            userId: user.id,
            tenantId: context.tenantId,
            device: dto,
         })
        const fullUser = await this.getUserOrThrow(user.id);
         const tokens = await this.generateTokens(
            fullUser as UserDocument, 
            'mobile'
        );
        return { user, ...tokens }
    }

    // ============================================
    // LOGIN
    // ============================================

    async webLogin(context: TenantContextDto, dto: WebLoginDto) {
        const user = await this.validateCredentials(context.tenantId, dto);
        await this.updateLastLogin(user._id.toString());
        return this.generateTokens(user, 'web');
    }

    async mobileLogin(context: TenantContextDto, dto: MobileLoginDto) {
        const user = await this.validateCredentials(context.tenantId, dto);
        await this.upsertDevice({
            userId: user._id.toString(),
            tenantId: context.tenantId,
            device: dto,
         })
        await this.updateLastLogin(user._id.toString());
        return this.generateTokens(user, 'mobile');
    }

    // ============================================
    // TOKEN MANAGEMENT
    // ============================================

    async refreshToken(
        context: TenantContextDto, 
        refreshToken: string,
        device?: DeviceDto
    ) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
            if (payload.tenantId !== context.tenantId) {
                throw new UnauthorizedException('Invalid tenant context');
            }

            if (device?.deviceId) {
                const deviceRecord = await this.deviceModel.findOne({
                    deviceId: device.deviceId,
                    tenantId: context.tenantId,
                    isActive: true,
                });
                if (!deviceRecord) {
                    throw new UnauthorizedException('Device deactivated or not found');
                }
            }

            const user = await this.userModel.findById(payload.sub);
            if (!user?.refreshToken) throw new UnauthorizedException("Session expired, please log in again");

            const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
            if (!isMatch) {
                await this.userModel.findByIdAndUpdate(user._id, { refreshToken: null });
                await this.deviceModel.updateMany(
                    { userId: user._id.toString() },
                    { isActive: false }
                );
                throw new UnauthorizedException('Security violation detected. All sessions have been revoked. Please log in again.');
            }
            if (device?.deviceId) {
                await this.deviceModel.findOneAndUpdate(
                    { deviceId: device.deviceId, tenantId: context.tenantId },
                    { lastUsedAt: new Date() }
                );
            }

            return this.generateTokens(user, device?.deviceId ? 'mobile' : 'web');
        } catch (err) {
            if (err instanceof TokenExpiredError) {
                throw new UnauthorizedException('Refresh token expired, please log in again');
            }
        }
    }

    // ============================================
    // LOGOUT
    // ============================================

    async logout(
        context: TenantContextDto,
        userId: string,
        device?: Pick<DeviceDocument, 'deviceId'>
    ) {
        if (device?.deviceId) {
            await this.deviceModel.findOneAndUpdate(
                { deviceId: device.deviceId, tenantId: context.tenantId, userId },
                { isActive: false }
            );
            const activeDevices = await this.deviceModel.countDocuments({
                tenantId: context.tenantId,
                userId,
                isActive: true,
            });
            if (activeDevices === 0) {
                await this.userModel.findByIdAndUpdate(userId, { refreshToken: null });
            }
        } else {
            await this.userModel.findByIdAndUpdate(
                {_id: userId, tenantId: context.tenantId},
                { refreshToken: null }
            );
        }
    }

    async logoutAllDevices(tenantId: string, userId: string) {
        await this.deviceModel.updateMany(
            { tenantId, userId },
            { isActive: false }
        );
        await this.userModel.findByIdAndUpdate(
            userId,
            { refreshToken: null }
        );
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    async getProfile(tenantId: string, userId: string) {
        const user = await this.userModel.findOne({
        _id: userId,
        tenantId,
        }).select("-password -refreshToken");

        if (!user) throw new UnauthorizedException("User not found");
        return user;
    }

    async getUserDevices(tenantId: string, userId: string) {
        return this.deviceModel
        .find({ userId, tenantId })
        .select("-pushToken")
        .sort({ lastUsedAt: -1 });
    }

    async changePassword(
        tenantId: string,
        userId: string,
        oldPassword: string,
        newPassword: string
    ) {
        const user = await this.userModel.findOne({ _id: userId, tenantId });
        if (!user) throw new UnauthorizedException("User not found");

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) throw new BadRequestException("Current password is incorrect");

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await this.userModel.findByIdAndUpdate(userId, {
        password: hashedPassword,
        mustChangePassword: false,
        });

        await this.logoutAllDevices(tenantId, userId);

        return { message: "Password changed. Please log in again." };
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    async validateCredentials(tenantId: string, credentials: CredentialsDto): Promise<UserDocument> {
        const user = await this.userModel.findOne({
            email: credentials.email.toLowerCase().trim(),
            tenantId,
            isActive: true,
        });
        if (!user) throw new UnauthorizedException('Invalid credentials');
        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');
        
        if (user.mustChangePassword) {
            throw new ForbiddenException('You must change your password before logging in. Please check your email for instructions.');
        }
        const { tenantId: _, password, refreshToken, ...result } = user.toObject();
        return result;
    }

    private async validateTenant(tenantId: string): Promise<TenantDocument> {
        const tenant = await this.tenantModel.findOne({
            slug: tenantId,
            isActive: true,
        });
        if (!tenant) throw new UnauthorizedException(`Tenant with ID ${tenantId} not found or inactive`);
        return tenant;
    }

    private async validateInvite( tenantId: string, email: string, code: string): Promise<InviteDocument> {
        const invite = await this.inviteModel.findOne({
            tenantId,
            email: email.toLowerCase(),
            code,
            used: false,
            expiresAt: { $gt: new Date() },
        });
        if (!invite) throw new UnauthorizedException('Invalid or expired invite code');
        return invite;
    }

    private async createUser(data: {
        tenantId: string;
        credentials: CredentialsDto;
        roles: Role[];
        mustChangePassword?: boolean;
    }) {
        const { tenantId, credentials, roles, mustChangePassword } = data;
        const existing = await this.userModel.findOne({
            email: credentials.email.toLowerCase().trim(),
            tenantId,
        })

        if (existing) {
            throw new UnauthorizedException('A user with that email already exists in this tenant');
        }
        const hashedPassword = await bcrypt.hash(credentials.password, 12);
        const user = await this.userModel.create({
            email: credentials.email.toLowerCase().trim(),
            password: hashedPassword,
            tenantId,
            roles,
            isActive: true,
            mustChangePassword: !!mustChangePassword,
        });

        return {
            id: user._id.toString(),
            email: user.email,
            roles: user.roles,
            tenantId: user.tenantId,
            createdAt: user.createdAt,
        }
    }

    private async generateTokens(user: UserDocument, type: 'web' | 'mobile') {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            tenantId: user.tenantId,
            roles: user.roles,
            type: 'access',
        };

        const accessExpiry = type === "mobile" ? "7d" : "15m";
        const refreshExpiry = type === "mobile" ? "90d" : "7d";

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: accessExpiry,
            }),
            this.jwtService.signAsync(
                { ...payload, type: 'refresh' },
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                    expiresIn: refreshExpiry,
                }
            ),
        ]);
        const refreshHash = await bcrypt.hash(refreshToken, 12);
        await this.userModel.findByIdAndUpdate(user._id, {
            refreshToken: refreshHash,
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: type === "mobile" ? 7 * 24 * 60 * 60 : 15 * 60, // in seconds
            tokenType: 'Bearer',
        }

    }

    private async getUserOrThrow(userId: string): Promise<UserDocument> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new UnauthorizedException("User not found");
        }
        return user;
    }

    private async upsertDevice(data: {
        tenantId: string;
        userId: string;
        device: DeviceDto;
    }) {
        await this.deviceModel.findOneAndUpdate(
            {deviceId: data.device.deviceId, tenantId: data.tenantId, userId: data.userId},
            {...data.device,}
            {upsert: true, new: true}
        )
    }

    private async updateLastLogin(userId: string) {
        await this.userModel.findByIdAndUpdate(userId, {
            lastLogin: new Date(),
        })
    }
}

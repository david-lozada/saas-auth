import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { User, UserSchema } from '../schemas/user.schema';
import { Device, DeviceSchema } from '../schemas/device.schema';
import { Invite, InviteSchema } from '../schemas/invite.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserRepository } from './repositories/user.repository';
import { InviteRepository } from './repositories/invite.repository';
import { DeviceRepository } from './repositories/device.repository';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Invite.name, schema: InviteSchema },
    ]),
    TenantModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    ConfigService,
    UserRepository,
    InviteRepository,
    DeviceRepository,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    UserRepository,
    InviteRepository,
    DeviceRepository,
  ],
})
export class AuthModule {}

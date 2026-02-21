import { Module, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";

import { Tenant, TenantSchema } from "./schemas/tenant.schema";
import { User, UserSchema } from "./schemas/user.schema";
import { Device, DeviceSchema } from "./schemas/device.schema";
import { Invite, InviteSchema } from "./schemas/invite.schema";

import { AuthModule } from "./auth/auth.module";
import { TenantMiddleware } from "./tenant/tenant.middleware";
import { TenantController } from "./tenant/tenant.controller";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || "mongodb://localhost:27017/multitenant_app"),
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Invite.name, schema: InviteSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "change-this-in-production",
      signOptions: { expiresIn: "15m" },
    }),
    AuthModule,
  ],
  controllers: [TenantController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
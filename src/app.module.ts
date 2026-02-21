import { Module, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
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
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';
import { AdminModule } from './admin/admin.module';
import configurations from "./config/configurations";
import { DatabaseConfig } from "./config/config.types";
import { BootstrapModule } from './bootstrap/bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,        // Available everywhere without importing
      load: configurations,   // Load your configuration files
      envFilePath: ['.env.local', '.env'], // Load these files
      cache: true,           // Cache config values for performance
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<{ database: DatabaseConfig }>) => ({
        uri: configService.get<string>('database.uri', { infer: true })!,
      }),
      inject: [ConfigService],
    }),
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
    BootstrapModule,
    AuthModule,
    AdminModule,
    BootstrapModule,
  ],
  controllers: [TenantController, AdminController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AdminService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
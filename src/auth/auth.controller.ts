import { Controller, Post, Get, Body, Req, UseGuards, Headers, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";

import {
  WebSignupDto,
  WebLoginDto,
  MobileSignupDto,
  MobileLoginDto,
  DeviceDto,
  TenantContextDto,
} from "./dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // ============================================
  // WEB
  // ============================================

  @Public()
  @Post("web/signup")
  async webSignup(@Req() req, @Body() dto: WebSignupDto) {
    return this.authService.webSignup({ tenantId: req.tenantId }, dto);
  }

  @Public()
  @Post("web/login")
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async webLogin(@Req() req, @Body() dto: WebLoginDto) {
    return this.authService.webLogin({ tenantId: req.tenantId }, dto);
  }

  // ============================================
  // MOBILE
  // ============================================

  @Public()
  @Post("mobile/signup")
  async mobileSignup(@Req() req, @Body() dto: MobileSignupDto) {
    return this.authService.mobileSignup({ tenantId: req.tenantId }, dto);
  }

  @Public()
  @Post("mobile/login")
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async mobileLogin(@Req() req, @Body() dto: MobileLoginDto) {
    return this.authService.mobileLogin({ tenantId: req.tenantId }, dto);
  }

  // ============================================
  // SHARED
  // ============================================

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req,
    @Body("refresh_token") refreshToken: string,
    @Headers("x-device-id") deviceId?: string,
    @Headers("x-device-name") deviceName?: string,
    @Headers("x-platform") platform?: string,
    @Headers("x-push-token") pushToken?: string,
  ) {
    const device = deviceId
      ? ({ deviceId, deviceName, platform, pushToken } as DeviceDto)
      : undefined;

    return this.authService.refreshToken({ tenantId: req.tenantId }, refreshToken, device);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req,
    @Headers("x-device-id") deviceId?: string,
  ) {
    await this.authService.logout(
      { tenantId: req.tenantId },
      req.user.userId,
      deviceId ? { deviceId } : undefined
    );
    return { message: "Logged out successfully" };
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req) {
    await this.authService.logoutAllDevices(req.tenantId, req.user.userId);
    return { message: "Logged out from all devices" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return this.authService.getProfile(req.tenantId, req.user.userId);
  }

  @Get("devices")
  @UseGuards(JwtAuthGuard)
  async getDevices(@Req() req) {
    return this.authService.getUserDevices(req.tenantId, req.user.userId);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.tenantId,
      req.user.userId,
      body.oldPassword,
      body.newPassword
    );
  }
}
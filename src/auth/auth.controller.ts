import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { UserDocument } from '../schemas/user.schema';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { TenantContext } from './decorators/tenant-context.decorator';
import {
  WebLoginDto,
  WebSignupDto,
  MobileLoginDto,
  MobileSignupDto,
  TenantContextDto,
} from './dto';

interface RequestWithUser {
  user: UserDocument;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('web/signup')
  async webSignup(
    @TenantContext() context: TenantContextDto,
    @Body() dto: WebSignupDto,
  ) {
    return this.authService.webSignup(context, dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('web/login')
  async webLogin(
    @TenantContext() context: TenantContextDto,
    @Req() req: RequestWithUser,
  ) {
    // LocalStrategy adds the validated user to req.user
    return this.authService.webLogin(context, req.user);
  }

  @Public()
  @Post('mobile/signup')
  async mobileSignup(
    @TenantContext() context: TenantContextDto,
    @Body() dto: MobileSignupDto,
  ) {
    return this.authService.mobileSignup(context, dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('mobile/login')
  async mobileLogin(
    @TenantContext() context: TenantContextDto,
    @Req() req: RequestWithUser,
    @Body() dto: MobileLoginDto,
  ) {
    return this.authService.mobileLogin(context, req.user, dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('super-admin/login')
  async superAdminLogin(
    @TenantContext() context: TenantContextDto,
    @Req() req: RequestWithUser,
  ) {
    // LocalStrategy adds the validated user to req.user
    return this.authService.superAdminLogin(context, req.user);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @TenantContext() context: TenantContextDto,
    @Body() dto: { refreshToken: string },
  ) {
    return this.authService.refreshToken(context, dto.refreshToken);
  }
}

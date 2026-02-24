import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantContext } from '../auth/decorators/tenant-context.decorator';
import { CurrentUser } from '../auth/guards/current-user.decorator';
import { TenantContextDto } from '../auth/dto';
import { PagoMovilService, VENEZUELAN_BANKS } from './pago-movil.service';
import {
  InitiatePagoMovilDto,
  SubmitPaymentProofDto,
  ReviewPagoMovilDto,
  UpdateExchangeRateDto,
} from './dto/pago-movil.dto';
import { ROLES } from '../common/constants/roles';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('pago-movil')
@Controller('payments/pago-movil')
export class PagoMovilController {
  constructor(private readonly pagoMovilService: PagoMovilService) {}

  @Get('banks')
  @ApiOperation({ summary: 'Get list of Venezuelan bank codes' })
  getBanks() {
    return {
      banks: Object.entries(VENEZUELAN_BANKS).map(([code, name]) => ({
        code,
        name,
      })),
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Get tenant Pago Movil configuration' })
  async getConfig(@TenantContext() context: TenantContextDto) {
    return this.pagoMovilService.getTenantConfig(context.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a Pago Movil payment' })
  async initiate(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: any,
    @Body() dto: InitiatePagoMovilDto,
  ) {
    return this.pagoMovilService.initiatePayment(context, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('submit-proof')
  @UseInterceptors(FileInterceptor('screenshot'))
  @ApiOperation({ summary: 'Submit payment proof (reference/screenshot)' })
  async submitProof(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: any,
    @Body() dto: SubmitPaymentProofDto,
    @UploadedFile() file: any,
  ) {
    // In a real scenario, upload 'file' to S3/Cloudinary here
    // const screenshotUrl = await this.uploadService.upload(file);
    // dto.screenshotUrl = screenshotUrl;

    return this.pagoMovilService.submitProof(context, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my-transactions')
  @ApiOperation({ summary: 'Get user transaction history' })
  async getMyTransactions(
    @TenantContext() context: TenantContextDto,
    @CurrentUser() user: any,
  ) {
    return this.pagoMovilService.getUserTransactions(
      user.userId,
      context.tenantId,
    );
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.SUPERADMIN)
  @ApiBearerAuth()
  @Get('admin/pending')
  @ApiOperation({ summary: 'Get pending transactions for review' })
  async getPending(
    @TenantContext() context: TenantContextDto,
    @Query('status') status?: string,
  ) {
    return this.pagoMovilService.getPendingTransactions(
      context.tenantId,
      status as any,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.SUPERADMIN)
  @ApiBearerAuth()
  @Get('admin/transaction/:id')
  @ApiOperation({ summary: 'Get transaction details for review' })
  async getTransactionDetails(
    @Param('id') id: string,
    @TenantContext() context: TenantContextDto,
  ) {
    return this.pagoMovilService.getTransactionDetails(id, context.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.SUPERADMIN)
  @ApiBearerAuth()
  @Post('admin/review')
  @ApiOperation({ summary: 'Approve or reject a Pago Movil payment' })
  async review(
    @Body() dto: ReviewPagoMovilDto,
    @CurrentUser() admin: any,
    @TenantContext() context: TenantContextDto,
  ) {
    return this.pagoMovilService.reviewPayment(
      admin.userId,
      context.tenantId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPERADMIN)
  @ApiBearerAuth()
  @Post('admin/exchange-rate')
  @ApiOperation({ summary: 'Update exchange rate for Bolivares' })
  async updateRate(
    @Body() dto: UpdateExchangeRateDto,
    @CurrentUser() admin: any,
    @TenantContext() context: TenantContextDto,
  ) {
    return this.pagoMovilService.updateExchangeRate(
      context.tenantId,
      dto.rate,
      admin.userId,
    );
  }
}

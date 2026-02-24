import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  PagoMovilTransaction,
  PagoMovilTransactionDocument,
  PagoMovilStatus,
} from '../schemas/pago-movil-transaction.schema';
import {
  PagoMovilConfig,
  PagoMovilConfigDocument,
} from '../schemas/pago-movil-config.schema';
import { SubscriptionService } from './subscription.service';
import { TenantContextDto } from '../auth/dto';
import {
  InitiatePagoMovilDto,
  SubmitPaymentProofDto,
  ReviewPagoMovilDto,
} from './dto/pago-movil.dto';

// Venezuelan bank codes
export const VENEZUELAN_BANKS = {
  '0102': 'Banco de Venezuela',
  '0104': 'Venezolano de Crédito',
  '0105': 'Mercantil',
  '0108': 'Provincial',
  '0114': 'Bancaribe',
  '0115': 'Exterior',
  '0116': 'Occidental de Descuento',
  '0128': 'Banco Caroní',
  '0134': 'Banesco',
  '0137': 'Sofitasa',
  '0138': 'Banco Plaza',
  '0146': 'Banco de la Gente Emprendedora',
  '0151': 'BFC Banco Fondo Común',
  '0156': '100% Banco',
  '0157': 'DelSur',
  '0163': 'Banco del Tesoro',
  '0166': 'Banco Agrícola de Venezuela',
  '0168': 'Bancrecer',
  '0169': 'Mi Banco',
  '0171': 'Banco Activo',
  '0172': 'Bancamiga',
  '0174': 'Banplus',
  '0175': 'Bicentenario del Pueblo',
  '0177': 'Banfanb',
  '0190': 'CitiBank',
  '0191': 'Banco Nacional de Crédito',
} as const;

@Injectable()
export class PagoMovilService {
  private readonly logger = new Logger(PagoMovilService.name);

  constructor(
    @InjectModel(PagoMovilTransaction.name)
    private transactionModel: Model<PagoMovilTransactionDocument>,
    @InjectModel(PagoMovilConfig.name)
    private configModel: Model<PagoMovilConfigDocument>,
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getTenantConfig(tenantId: string) {
    const config = await this.configModel
      .findOne({ tenantId, enabled: true })
      .lean();

    if (!config) {
      throw new NotFoundException('Pago Móvil not enabled for this tenant');
    }

    return {
      ...config,
      instructions: [
        `1. Open your bank's app`,
        `2. Select Pago Móvil`,
        `3. Enter phone: ${config.phoneNumber}`,
        `4. Enter bank: ${config.bankName} (${config.bankCode})`,
        `5. Enter ID: ${config.idNumber}`,
        `6. Enter amount in VES (rate: ${config.exchangeRate} VES/USD)`,
        `7. Save screenshot of confirmation`,
      ],
    };
  }

  async initiatePayment(
    context: TenantContextDto,
    userId: string,
    dto: InitiatePagoMovilDto,
  ) {
    const config = await this.configModel.findOne({
      tenantId: context.tenantId,
      enabled: true,
    });

    if (!config) {
      throw new BadRequestException('Pago Móvil not available');
    }

    if (
      dto.amountUSD < config.minAmountUSD ||
      dto.amountUSD > config.maxAmountUSD
    ) {
      throw new BadRequestException(
        `Amount must be between $${config.minAmountUSD} and $${config.maxAmountUSD}`,
      );
    }

    const existingPending = await this.transactionModel.findOne({
      userId,
      tenantId: context.tenantId,
      status: { $in: [PagoMovilStatus.PENDING, PagoMovilStatus.UNDER_REVIEW] },
    });

    if (existingPending) {
      throw new BadRequestException(
        'You have a pending Pago Móvil transaction. Please complete or cancel it first.',
      );
    }

    const existingRef = await this.transactionModel.findOne({
      referenceNumber: dto.referenceNumber,
      bankCode: dto.bankCode,
      status: { $in: [PagoMovilStatus.APPROVED, PagoMovilStatus.UNDER_REVIEW] },
    });

    if (existingRef) {
      throw new BadRequestException(
        'This reference number has already been used',
      );
    }

    const amountVES = Math.round(dto.amountUSD * config.exchangeRate);

    const transaction = await this.transactionModel.create({
      userId,
      tenantId: context.tenantId,
      planId: dto.planId,
      amount: amountVES,
      amountUSD: dto.amountUSD,
      phoneNumber: dto.phoneNumber,
      bankCode: dto.bankCode,
      referenceNumber: dto.referenceNumber,
      paymentDate: new Date(dto.paymentDate),
      status: PagoMovilStatus.PENDING,
      expiresAt: new Date(
        Date.now() + config.verificationHours * 60 * 60 * 1000,
      ),
      adminNotes: dto.notes,
    });

    return {
      transactionId: transaction._id,
      status: transaction.status,
      amountVES,
      amountUSD: dto.amountUSD,
      exchangeRate: config.exchangeRate,
      expiresAt: transaction.expiresAt,
      nextStep: config.requireScreenshot ? 'UPLOAD_PROOF' : 'WAIT_VERIFICATION',
    };
  }

  async submitProof(
    context: TenantContextDto,
    userId: string,
    dto: SubmitPaymentProofDto,
  ) {
    const transaction = await this.transactionModel.findOne({
      _id: dto.transactionId,
      userId,
      tenantId: context.tenantId,
      status: PagoMovilStatus.PENDING,
    });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction not found or not in pending status',
      );
    }

    if (new Date() > transaction.expiresAt) {
      await this.transactionModel.findByIdAndUpdate(transaction._id, {
        status: PagoMovilStatus.EXPIRED,
      });
      throw new BadRequestException(
        'Payment window expired. Please initiate new payment.',
      );
    }

    await this.transactionModel.findByIdAndUpdate(transaction._id, {
      screenshotUrl: dto.screenshotUrl,
      status: PagoMovilStatus.UNDER_REVIEW,
    });

    this.logger.log(
      `New Pago Móvil payment pending review: ${transaction._id}`,
    );

    return {
      message: 'Payment proof submitted. Awaiting admin verification.',
      transactionId: transaction._id,
      status: PagoMovilStatus.UNDER_REVIEW,
    };
  }

  async getUserTransactions(userId: string, tenantId: string) {
    return this.transactionModel
      .find({ userId, tenantId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getPendingTransactions(tenantId: string, status?: PagoMovilStatus) {
    const query: any = { tenantId };

    if (status) {
      query.status = status;
    } else {
      query.status = {
        $in: [PagoMovilStatus.PENDING, PagoMovilStatus.UNDER_REVIEW],
      };
    }

    return this.transactionModel
      .find(query)
      .populate('userId', 'email profile')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getTransactionDetails(transactionId: string, adminTenantId: string) {
    const transaction = await this.transactionModel
      .findById(transactionId)
      .populate('userId', 'email profile');

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (adminTenantId !== 'system' && transaction.tenantId !== adminTenantId) {
      throw new ForbiddenException('Access denied');
    }

    const similarTransactions = await this.transactionModel
      .find({
        $or: [
          {
            phoneNumber: transaction.phoneNumber,
            _id: { $ne: transaction._id },
          },
          {
            referenceNumber: transaction.referenceNumber,
            _id: { $ne: transaction._id },
          },
        ],
        status: { $in: [PagoMovilStatus.APPROVED, PagoMovilStatus.REJECTED] },
      })
      .limit(5)
      .select('status referenceNumber createdAt')
      .lean();

    return {
      transaction,
      similarTransactions,
    };
  }

  async reviewPayment(
    adminId: string,
    adminTenantId: string,
    dto: ReviewPagoMovilDto,
  ) {
    const transaction = await this.transactionModel.findById(dto.transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (
      transaction.status !== PagoMovilStatus.UNDER_REVIEW &&
      transaction.status !== PagoMovilStatus.PENDING
    ) {
      throw new BadRequestException(
        `Transaction already ${transaction.status}`,
      );
    }

    if (adminTenantId !== 'system' && transaction.tenantId !== adminTenantId) {
      throw new ForbiddenException(
        'Cannot review transactions from other tenants',
      );
    }

    if (dto.action === 'approve') {
      await this.transactionModel.findByIdAndUpdate(dto.transactionId, {
        status: PagoMovilStatus.APPROVED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNotes: dto.adminNotes,
      });

      // We need to implement createSubscriptionFromPayment in SubscriptionService
      await this.subscriptionService.createSubscriptionFromPayment({
        userId: transaction.userId.toString(),
        tenantId: transaction.tenantId,
        planId: transaction.planId,
        amount: transaction.amountUSD,
        currency: 'USD',
        paymentMethod: 'pago_movil',
        paymentReference: transaction.referenceNumber,
        transactionId: transaction._id.toString(),
      });

      return {
        message: 'Payment approved and subscription activated',
        transactionId: dto.transactionId,
      };
    } else {
      await this.transactionModel.findByIdAndUpdate(dto.transactionId, {
        status: PagoMovilStatus.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNotes: dto.adminNotes,
        rejectionReason: dto.rejectionReason,
      });

      return {
        message: 'Payment rejected',
        transactionId: dto.transactionId,
        reason: dto.rejectionReason,
      };
    }
  }

  async updateExchangeRate(tenantId: string, rate: number, adminId: string) {
    return this.configModel.findOneAndUpdate(
      { tenantId },
      {
        exchangeRate: rate,
      },
      { upsert: true, new: true },
    );
  }
}

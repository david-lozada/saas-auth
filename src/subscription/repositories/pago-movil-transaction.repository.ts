import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import {
  PagoMovilTransaction,
  PagoMovilTransactionDocument,
  PagoMovilStatus,
} from '../../schemas/pago-movil-transaction.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class PagoMovilTransactionRepository extends BaseRepository<PagoMovilTransactionDocument> {
  constructor(
    @InjectModel(PagoMovilTransaction.name)
    transactionModel: Model<PagoMovilTransactionDocument>,
  ) {
    super(transactionModel);
  }

  async findById(id: string): Promise<PagoMovilTransactionDocument | null> {
    return this.entityModel.findById(id).exec();
  }

  async findByIdWithUser(
    id: string,
  ): Promise<PagoMovilTransactionDocument | null> {
    return this.entityModel
      .findById(id)
      .populate('userId', 'email profile')
      .exec();
  }

  async findByIdAndUpdate(
    id: string,
    updateData: UpdateQuery<PagoMovilTransaction>,
  ): Promise<PagoMovilTransactionDocument | null> {
    return this.entityModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async findPendingTransaction(
    userId: string,
    tenantId: string,
  ): Promise<PagoMovilTransactionDocument | null> {
    return this.entityModel
      .findOne({
        userId,
        tenantId,
        status: {
          $in: [PagoMovilStatus.PENDING, PagoMovilStatus.UNDER_REVIEW],
        },
      })
      .exec();
  }

  async findExistingReference(
    referenceNumber: string,
    bankCode: string,
  ): Promise<PagoMovilTransactionDocument | null> {
    return this.entityModel
      .findOne({
        referenceNumber,
        bankCode,
        status: {
          $in: [PagoMovilStatus.APPROVED, PagoMovilStatus.UNDER_REVIEW],
        },
      })
      .exec();
  }

  async findByUserIdAndTenantId(userId: string, tenantId: string) {
    return this.entityModel
      .find({ userId, tenantId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findPendingByTenantId(tenantId: string, statusFilter?: any) {
    return this.entityModel
      .find({ tenantId, ...statusFilter })
      .populate('userId', 'email profile')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findSimilarTransactions(transaction: PagoMovilTransactionDocument) {
    return this.entityModel
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
  }
}

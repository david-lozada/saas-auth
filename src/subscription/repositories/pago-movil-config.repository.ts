import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PagoMovilConfig,
  PagoMovilConfigDocument,
} from '../../schemas/pago-movil-config.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class PagoMovilConfigRepository extends BaseRepository<PagoMovilConfigDocument> {
  constructor(
    @InjectModel(PagoMovilConfig.name)
    configModel: Model<PagoMovilConfigDocument>,
  ) {
    super(configModel);
  }

  async findByTenantId(
    tenantId: string,
  ): Promise<PagoMovilConfigDocument | null> {
    return this.entityModel.findOne({ tenantId, enabled: true }).exec();
  }

  async findByTenantIdLean(tenantId: string): Promise<PagoMovilConfig | null> {
    return this.entityModel.findOne({ tenantId, enabled: true }).lean();
  }

  async updateExchangeRate(
    tenantId: string,
    rate: number,
  ): Promise<PagoMovilConfigDocument | null> {
    return this.entityModel
      .findOneAndUpdate(
        { tenantId },
        { exchangeRate: rate },
        { upsert: true, new: true },
      )
      .exec();
  }
}

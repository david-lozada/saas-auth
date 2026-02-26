import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class TenantRepository extends BaseRepository<TenantDocument> {
  constructor(@InjectModel(Tenant.name) tenantModel: Model<TenantDocument>) {
    super(tenantModel);
  }

  async findById(id: string): Promise<TenantDocument | null> {
    return this.entityModel.findById(id).exec();
  }

  async findByIdWithPlan(id: string): Promise<TenantDocument | null> {
    return this.entityModel.findById(id).populate('plan').exec();
  }

  async findByIdWithPlanLean(id: string): Promise<Tenant | null> {
    return this.entityModel.findById(id).populate('plan').lean();
  }

  async findByIdLean(id: string): Promise<Tenant | null> {
    return this.entityModel.findById(id).lean();
  }

  async findBySlugLean(slug: string): Promise<Tenant | null> {
    return this.entityModel.findOne({ slug, isActive: true }).lean();
  }

  async findByIdOrSlugLean(idOrSlug: string): Promise<Tenant | null> {
    return this.entityModel
      .findOne({
        $or: [{ slug: idOrSlug }, { _id: idOrSlug }],
        isActive: true,
      })
      .lean();
  }

  async findByDomainLean(domain: string): Promise<Tenant | null> {
    return this.entityModel
      .findOne({
        isActive: true,
        'settings.allowedDomains': domain.toLowerCase(),
      })
      .lean();
  }

  async findByIdAndUpdate(
    id: string,
    updateData: UpdateQuery<Tenant>,
  ): Promise<TenantDocument | null> {
    return this.entityModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async findByIdAndUpdateWithPlan(
    id: string,
    updateData: UpdateQuery<Tenant>,
  ): Promise<TenantDocument | null> {
    return this.entityModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('plan')
      .exec();
  }

  async updateSubscriptionStatusBySubId(
    subscriptionId: string,
    status: string,
  ): Promise<TenantDocument | null> {
    return this.entityModel
      .findOneAndUpdate(
        { 'subscription.subscriptionId': subscriptionId },
        { 'subscription.status': status },
        { new: true },
      )
      .exec();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class PlanRepository extends BaseRepository<PlanDocument> {
  constructor(@InjectModel(Plan.name) planModel: Model<PlanDocument>) {
    super(planModel);
  }

  async findById(id: string): Promise<PlanDocument | null> {
    return this.entityModel.findById(id).exec();
  }

  async findActivePlans(): Promise<PlanDocument[]> {
    return this.entityModel.find({ isActive: true }).sort({ amount: 1 }).exec();
  }
}

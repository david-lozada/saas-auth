import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
  constructor(@InjectModel(User.name) userModel: Model<UserDocument>) {
    super(userModel);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.entityModel.findById(id).exec();
  }

  async findByEmail(
    email: string,
    tenantId?: string,
  ): Promise<UserDocument | null> {
    const query: any = { email: email.toLowerCase().trim(), isActive: true };
    if (tenantId) {
      query.tenantId = tenantId;
    } else {
      query.tenantId = { $exists: false };
    }
    return this.entityModel.findOne(query).exec();
  }

  async findByTenantId(
    tenantId: string,
    userId: string,
  ): Promise<UserDocument | null> {
    return this.entityModel.findOne({ _id: userId, tenantId }).exec();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.entityModel.findByIdAndUpdate(userId, { refreshToken }).exec();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.entityModel
      .findByIdAndUpdate(userId, { lastLogin: new Date() })
      .exec();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from '../../schemas/device.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class DeviceRepository extends BaseRepository<DeviceDocument> {
  constructor(@InjectModel(Device.name) deviceModel: Model<DeviceDocument>) {
    super(deviceModel);
  }

  async findActiveDevice(
    deviceId: string,
    tenantId: string,
  ): Promise<DeviceDocument | null> {
    return this.entityModel
      .findOne({
        deviceId,
        tenantId,
        isActive: true,
      })
      .exec();
  }

  async deactivateUserDevices(
    userId: string,
    tenantId?: string,
  ): Promise<void> {
    const query: any = { userId };
    if (tenantId) query.tenantId = tenantId;
    await this.entityModel.updateMany(query, { isActive: false }).exec();
  }

  async countActiveDevices(userId: string, tenantId: string): Promise<number> {
    return this.entityModel
      .countDocuments({
        userId,
        tenantId,
        isActive: true,
      })
      .exec();
  }

  async upsertDevice(
    userId: string,
    tenantId: string,
    deviceData: any,
  ): Promise<DeviceDocument | null> {
    return this.entityModel
      .findOneAndUpdate(
        {
          deviceId: deviceData.deviceId,
          tenantId,
          userId,
        },
        { ...deviceData, lastUsedAt: new Date(), isActive: true },
        { upsert: true, new: true },
      )
      .exec();
  }
}

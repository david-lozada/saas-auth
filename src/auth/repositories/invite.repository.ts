import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invite, InviteDocument } from '../../schemas/invite.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class InviteRepository extends BaseRepository<InviteDocument> {
  constructor(@InjectModel(Invite.name) inviteModel: Model<InviteDocument>) {
    super(inviteModel);
  }

  async findValidInvite(
    tenantId: string,
    email: string,
    code: string,
  ): Promise<InviteDocument | null> {
    return this.entityModel
      .findOne({
        tenantId,
        email: email.toLowerCase().trim(),
        code,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }
}

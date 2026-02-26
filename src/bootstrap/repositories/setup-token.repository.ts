import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SetupToken,
  SetupTokenDocument,
} from '../../schemas/setup-token.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class SetupTokenRepository extends BaseRepository<SetupTokenDocument> {
  constructor(
    @InjectModel(SetupToken.name) setupTokenModel: Model<SetupTokenDocument>,
  ) {
    super(setupTokenModel);
  }

  async findValidToken(tokenHash: string): Promise<SetupTokenDocument | null> {
    return this.entityModel
      .findOne({
        tokenHash,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }
}

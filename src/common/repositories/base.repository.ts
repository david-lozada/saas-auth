import {
  Document,
  Model,
  QueryFilter as FilterQuery,
  UpdateQuery,
} from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly entityModel: Model<T>) {}

  async findOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T | null> {
    return this.entityModel.findOne(entityFilterQuery, projection).exec();
  }

  async find(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T[]> {
    return this.entityModel.find(entityFilterQuery, projection).exec();
  }

  async create(createEntityData: unknown): Promise<T> {
    const entity = new this.entityModel(createEntityData);
    return entity.save() as Promise<T>;
  }

  async findOneAndUpdate(
    entityFilterQuery: FilterQuery<T>,
    updateEntityData: UpdateQuery<T>,
  ): Promise<T | null> {
    return this.entityModel
      .findOneAndUpdate(entityFilterQuery, updateEntityData, {
        new: true,
      })
      .exec();
  }

  async deleteMany(entityFilterQuery: FilterQuery<T>): Promise<boolean> {
    const deleteResult = await this.entityModel
      .deleteMany(entityFilterQuery)
      .exec();
    return deleteResult.deletedCount >= 1;
  }
}

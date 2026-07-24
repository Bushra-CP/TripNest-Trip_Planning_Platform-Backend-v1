import type { Document, ClientSession, QueryFilter, Model, UpdateQuery } from "mongoose";
import { IBaseRepository } from "../interfaces/IRepository/IBaseRepository";

export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  //////////////////////////////////////////////////
  async create(data: Partial<T>, session?: ClientSession): Promise<T> {
    const document = new this.model(data);

    await document.save(session ? { session } : undefined);

    return document;
  }

  //////////////////////////////////////////////////
  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  //////////////////////////////////////////////////
  async findOne(filter: QueryFilter<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  //////////////////////////////////////////////////
  async find(filter: QueryFilter<T> = {}): Promise<T[]> {
    return this.model.find(filter).exec();
  }

  //////////////////////////////////////////////////
  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, data, {
        new: true,
      })
      .exec();
  }

  //////////////////////////////////////////////////

  async updateOne(filter: QueryFilter<T>, data: UpdateQuery<T>): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filter, data, {
        returnDocument: "after",
      })
      .exec();
  }

  //////////////////////////////////////////////////
  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  //////////////////////////////////////////////////

  async deleteOne(filter: QueryFilter<T>): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();

    return result.deletedCount > 0;
  }

  //////////////////////////////////////////////////
  async exists(filter: QueryFilter<T>): Promise<boolean> {
    const result = await this.model.exists(filter);

    return result !== null;
  }

  //////////////////////////////////////////////////
  async count(filter: QueryFilter<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}

import { ClientSession, QueryFilter, UpdateQuery } from "mongoose";

export interface IBaseRepository<T> {
  create(data: Partial<T>, session?: ClientSession): Promise<T>;

  findById(id: string): Promise<T | null>;

  findOne(filter: QueryFilter<T>): Promise<T | null>;

  find(filter?: QueryFilter<T>): Promise<T[]>;

  updateById(id: string, data: UpdateQuery<T>): Promise<T | null>;

  updateOne(filter: QueryFilter<T>, data: UpdateQuery<T>): Promise<T | null>;

  deleteById(id: string): Promise<T | null>;

  deleteOne(filter: QueryFilter<T>): Promise<boolean>;

  exists(filter: QueryFilter<T>): Promise<boolean>;

  count(filter?: QueryFilter<T>): Promise<number>;
}

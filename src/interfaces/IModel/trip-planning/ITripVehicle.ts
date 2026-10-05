import { Document, Types } from "mongoose";
import { IVehicle } from "./IVehicle";

export interface ITripVehicle extends Document {
  tripId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  addedBy: Types.ObjectId;
  voters: Types.ObjectId[];
  finalSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPopulatedTripVehicle {
  _id: Types.ObjectId;
  tripId: Types.ObjectId;
  vehicleId: IVehicle;
  addedBy: Types.ObjectId;
  voters: Types.ObjectId[];
  finalSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

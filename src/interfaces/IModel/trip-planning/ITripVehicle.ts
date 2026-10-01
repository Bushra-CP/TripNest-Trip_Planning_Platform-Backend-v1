import { Document, Types } from "mongoose";

export interface ITripVehicle extends Document {
  tripId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  addedBy: Types.ObjectId;
  voters: Types.ObjectId[];
  finalSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

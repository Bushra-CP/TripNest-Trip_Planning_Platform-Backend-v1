import { IPopulatedTripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";

export interface TripVehicleResponse {
  _id: string;
  tripId: string;
  vehicle: {
    _id: string;
    ownerId: string;
    name: string;
    type: string;
    fuelType: string;
    fuelEfficiency: number;
    seatingCapacity: number;
    additionalDetails?: string;
  };
  addedBy: string;
  voters: string[];
  finalSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

export class TripVehicleMapper {
  static toResponse(tripVehicle: IPopulatedTripVehicle): TripVehicleResponse {
    return {
      _id: tripVehicle._id.toString(),
      tripId: tripVehicle.tripId.toString(),

      vehicle: {
        _id: tripVehicle.vehicleId._id.toString(),
        ownerId: tripVehicle.vehicleId.ownerId.toString(),
        name: tripVehicle.vehicleId.name,
        type: tripVehicle.vehicleId.type,
        fuelType: tripVehicle.vehicleId.fuelType,
        fuelEfficiency: tripVehicle.vehicleId.fuelEfficiency,
        seatingCapacity: tripVehicle.vehicleId.seatingCapacity,
        ...(tripVehicle.vehicleId.additionalDetails !== undefined && {
          additionalDetails: tripVehicle.vehicleId.additionalDetails,
        }),
      },

      addedBy: tripVehicle.addedBy.toString(),

      voters: tripVehicle.voters.map((voter) => voter.toString()),

      finalSelected: tripVehicle.finalSelected,

      createdAt: tripVehicle.createdAt.toISOString(),
      updatedAt: tripVehicle.updatedAt.toISOString(),
    };
  }
}

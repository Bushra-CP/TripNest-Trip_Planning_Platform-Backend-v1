import { FuelType } from "@/interfaces/IModel/trip-planning/IVehicle";

export type TripCostStatus = "AVAILABLE" | "UNAVAILABLE";

export interface ITripVehicleCost {
  tripVehicleId: string;
  vehicleId: string;
  vehicleName: string;

  fuelType: FuelType;
  fuelEfficiency: number;

  distanceKm: number;

  requiredEnergy: number | null; //PETROL   → litres, DIESEL   → litres, ELECTRIC → kWh
  energyPrice: number | null; //PETROL   → ₹/litre, DIESEL   → ₹/litre, ELECTRIC → ₹/kWh

  estimatedCost: number | null;

  priceUnit: string | null;
  priceLocation: string | null;
  pricingSource: string | null;

  costStatus: TripCostStatus;
}

export interface ITripCostResponse {
  tripId: string;
  distanceKm: number;
  vehicles: ITripVehicleCost[];
}

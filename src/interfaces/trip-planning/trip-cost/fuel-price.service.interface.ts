export type FuelPriceType = "PETROL" | "DIESEL";

export interface IFuelPrice {
  fuelType: FuelPriceType;
  price: number;
  unit: "per_litre";
  location: string;
  fetchedAt: string;
}

export interface IFuelPriceService {
  getFuelPrice(fuelType: FuelPriceType, location: string): Promise<IFuelPrice>;
}

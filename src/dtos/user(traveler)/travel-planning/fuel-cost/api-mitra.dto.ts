export interface IApiMitraFuelPrice {
  price: number;
  unit: string;
  change_pct: number;
}

export interface IApiMitraFuelResponse {
  status: string;
  endpoint: string;
  city?: string;
  state?: string;
  fuels: string[];

  price: {
    location: string;
    location_type: string;
    petrol: IApiMitraFuelPrice;
    diesel: IApiMitraFuelPrice;
  };

  fetched_at: string;
}

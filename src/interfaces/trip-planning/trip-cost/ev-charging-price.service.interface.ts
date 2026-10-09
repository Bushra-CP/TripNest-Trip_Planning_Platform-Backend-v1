export interface IEVChargingPriceService {
  getChargingPrice(state: string): Promise<number | null>;
}

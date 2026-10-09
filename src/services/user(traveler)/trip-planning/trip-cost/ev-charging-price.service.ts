import { EV_TARIFFS } from "@/config/ev-tariff.config";
import { IEVChargingPriceService } from "@/interfaces/trip-planning/trip-cost/ev-charging-price.service.interface";
import { injectable } from "inversify";

@injectable()
export class EVChargingPriceService implements IEVChargingPriceService {
  async getChargingPrice(state: string): Promise<number | null> {
    const normalizedState = state.trim().toUpperCase();

    const tariff = EV_TARIFFS[normalizedState];

    if (!tariff) {
      console.log("EV tariff not found for state:", normalizedState);
      return null;
    }

    return tariff.lt;
  }
}

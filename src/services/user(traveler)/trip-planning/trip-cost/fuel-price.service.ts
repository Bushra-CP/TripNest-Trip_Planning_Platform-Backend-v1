import axios, { AxiosError } from "axios";
import { injectable } from "inversify";
import { env } from "@/config/env";
import { redisConnection } from "@/config/redis";
import {
  FuelPriceType,
  IFuelPrice,
  IFuelPriceService,
} from "@/interfaces/trip-planning/trip-cost/fuel-price.service.interface";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";

interface IIndianApiFuelPrice {
  city: string;
  price: string;
  change: string;
}

@injectable()
export class FuelPriceService implements IFuelPriceService {
  private readonly _baseUrl = "https://fuel.indianapi.in";

  private readonly _cacheDuration = 24 * 60 * 60;

  async getFuelPrice(fuelType: FuelPriceType, location: string): Promise<IFuelPrice> {
    const normalizedLocation = location.trim().toLowerCase();

    const cacheKey = `fuel-price:${normalizedLocation}:${fuelType}`;

    // Check Redis cache
    try {
      const cachedPrice = await redisConnection.get(cacheKey);

      if (cachedPrice) {
        console.log(`Fuel price cache HIT: ${cacheKey}`);

        return JSON.parse(cachedPrice) as IFuelPrice;
      }

      console.log(`Fuel price cache MISS: ${cacheKey}`);
    } catch (error) {
      console.error("Redis cache read error:", error);
    }

    // Cache miss → call IndianAPI
    try {
      console.log(`Fetching ${fuelType} price for ${location} from IndianAPI...`);

      const response = await axios.get<IIndianApiFuelPrice[]>(`${this._baseUrl}/live_fuel_price`, {
        params: {
          fuel_type: fuelType.toLowerCase(),
          location_type: "city",
          location: normalizedLocation,
        },
        headers: {
          Accept: "application/json",
          "x-api-key": env.INDIAN_FUEL_PRICE_API_KEY,
        },
        timeout: 5000,
      });

      const data = response.data;

      // Find requested city
      const priceData = data.find((item) => item.city.trim().toLowerCase() === normalizedLocation);

      if (!priceData) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.FUEL_PRICE_NOT_FOUND);
      }

      const price = Number(priceData.price);

      if (Number.isNaN(price)) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.FUEL_PRICE_NOT_FOUND);
      }

      // Create fuel price object
      const fuelPrice: IFuelPrice = {
        fuelType,
        price,
        unit: "per_litre",
        location: priceData.city,
        fetchedAt: new Date().toISOString(),
      };

      // Store in Redis for 24 hours
      try {
        await redisConnection.set(cacheKey, JSON.stringify(fuelPrice), "EX", this._cacheDuration);

        console.log(`Fuel price cached for 24 hours: ${cacheKey}`);
      } catch (error) {
        console.error("Redis cache write error:", error);
      }

      return fuelPrice;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const axiosError = error as AxiosError;

      console.error("IndianAPI fuel price error:", axiosError.response?.data ?? axiosError.message);

      throw new AppError(
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        ErrorMessages.FUEL_PRICE_SERVICE_UNAVAILABLE,
      );
    }
  }
}

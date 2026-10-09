import { inject, injectable } from "inversify";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { ITripRouteRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-route.repository.interface";
import { TYPES } from "@/di/types";
import { ITripCostService } from "@/interfaces/trip-planning/trip-cost/trip-cost.service.interface";
import { ITripVehicleRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-vehicle-repo.interface";
import {
  FuelPriceType,
  IFuelPrice,
  IFuelPriceService,
} from "@/interfaces/trip-planning/trip-cost/fuel-price.service.interface";
import { IEVChargingPriceService } from "@/interfaces/trip-planning/trip-cost/ev-charging-price.service.interface";
import { ITripCostResponse } from "@/dtos/user(traveler)/travel-planning/fuel-cost/trip-cost.dto";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";
import { ITripVehicleCost } from "@/dtos/user(traveler)/travel-planning/fuel-cost/trip-cost.dto";

@injectable()
export class TripCostService implements ITripCostService {
  constructor(
    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,

    @inject(TYPES.TripRouteRepository)
    private readonly _tripRouteRepository: ITripRouteRepository,

    @inject(TYPES.TripVehicleRepository)
    private readonly _tripVehicleRepository: ITripVehicleRepository,

    @inject(TYPES.FuelPriceService)
    private readonly _fuelPriceService: IFuelPriceService,

    @inject(TYPES.EVChargingPriceService)
    private readonly _evChargingPriceService: IEVChargingPriceService,
  ) {}

  async getTripVehicleCosts(tripId: string): Promise<ITripCostResponse> {
    // Check trip
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    // Get current route
    const route = await this._tripRouteRepository.findByTripId(tripId);

    if (!route) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_ROUTE_NOT_FOUND);
    }

    // Get vehicles added to this trip
    const tripVehicles = await this._tripVehicleRepository.findByTripId(tripId);

    console.log(tripVehicles);

    const distanceKm = route.distanceMeters / 1000;

    /*
     * The route contains structured location data:
     *
     * Petrol/Diesel -> city
     * Electric      -> state
     */
    const startingLocation = route.locations[0];

    const city = startingLocation?.city ?? null;
    const state = startingLocation?.state ?? null;

    /*
     * Cache fuel prices during this request.
     */
    const fuelPriceCache = new Map<string, IFuelPrice>();

    const vehicles: ITripVehicleCost[] = await Promise.all(
      tripVehicles.map(async (tripVehicle) => {
        const vehicle = tripVehicle.vehicleId;

        /*
         * OTHER: We don't have a pricing calculation for OTHER.
         */
        if (vehicle.fuelType === "OTHER") {
          return this.createUnavailableVehicleCost(
            tripVehicle._id.toString(),
            vehicle._id.toString(),
            vehicle.name,
            vehicle.fuelType,
            vehicle.fuelEfficiency,
            distanceKm,
          );
        }

        /*
         * PETROL / DIESEL
         */
        if (vehicle.fuelType === "PETROL" || vehicle.fuelType === "DIESEL") {
          //City is required for API Mitra fuel price lookup.
          if (!city) {
            return this.createUnavailableVehicleCost(
              tripVehicle._id.toString(),
              vehicle._id.toString(),
              vehicle.name,
              vehicle.fuelType,
              vehicle.fuelEfficiency,
              distanceKm,
            );
          }

          const cacheKey = `${vehicle.fuelType}-${city}`;

          let fuelPrice = fuelPriceCache.get(cacheKey);

          if (!fuelPrice) {
            fuelPrice = await this._fuelPriceService.getFuelPrice(
              vehicle.fuelType as FuelPriceType,
              city,
            );

            fuelPriceCache.set(cacheKey, fuelPrice);
          }

          /*
           * Calculation
           *
           * distance = 300 km
           * efficiency = 18 km/L
           *
           * requiredEnergy = 300 / 18
           *                = 16.67 litres
           */
          const requiredEnergy = distanceKm / vehicle.fuelEfficiency;

          //requiredEnergy × current fuel price
          const estimatedCost = requiredEnergy * fuelPrice.price;

          return {
            tripVehicleId: tripVehicle._id.toString(),

            vehicleId: vehicle._id.toString(),

            vehicleName: vehicle.name,

            fuelType: vehicle.fuelType,

            fuelEfficiency: vehicle.fuelEfficiency,

            distanceKm: Number(distanceKm.toFixed(2)),

            requiredEnergy: Number(requiredEnergy.toFixed(2)),

            energyPrice: Number(fuelPrice.price.toFixed(2)),

            estimatedCost: Number(estimatedCost.toFixed(2)),

            priceUnit: fuelPrice.unit,

            priceLocation: fuelPrice.location,

            pricingSource: "INDIAN_API",

            costStatus: "AVAILABLE",
          };
        }

        /*
         * ELECTRIC: EV price is based on the state where the trip starts.
         */
        if (vehicle.fuelType === "ELECTRIC") {
          //State is required for EV tariff lookup.
          if (!state) {
            return this.createUnavailableVehicleCost(
              tripVehicle._id.toString(),
              vehicle._id.toString(),
              vehicle.name,
              vehicle.fuelType,
              vehicle.fuelEfficiency,
              distanceKm,
            );
          }

          const chargingPrice = await this._evChargingPriceService.getChargingPrice(state);

          // If no tariff is available for the state, cost cannot be calculated.
          if (chargingPrice === null) {
            return this.createUnavailableVehicleCost(
              tripVehicle._id.toString(),
              vehicle._id.toString(),
              vehicle.name,
              vehicle.fuelType,
              vehicle.fuelEfficiency,
              distanceKm,
            );
          }

          /*
           * For EV:
           *
           * fuelEfficiency = km/kWh
           *
           * Example:
           *
           * distance = 300 km
           * efficiency = 6 km/kWh
           *
           * requiredEnergy = 300 / 6
           *                = 50 kWh
           */
          const requiredEnergy = distanceKm / vehicle.fuelEfficiency;

          //requiredEnergy × electricity price
          const estimatedCost = requiredEnergy * chargingPrice;

          return {
            tripVehicleId: tripVehicle._id.toString(),

            vehicleId: vehicle._id.toString(),

            vehicleName: vehicle.name,

            fuelType: vehicle.fuelType,

            fuelEfficiency: vehicle.fuelEfficiency,

            distanceKm: Number(distanceKm.toFixed(2)),

            requiredEnergy: Number(requiredEnergy.toFixed(2)),

            energyPrice: Number(chargingPrice.toFixed(2)),

            estimatedCost: Number(estimatedCost.toFixed(2)),

            priceUnit: "per_kWh",

            priceLocation: state,

            pricingSource: "STATE_EV_TARIFF",

            costStatus: "AVAILABLE",
          };
        }

        /*
         * Safety fallback
         */
        return this.createUnavailableVehicleCost(
          tripVehicle._id.toString(),
          vehicle._id.toString(),
          vehicle.name,
          vehicle.fuelType,
          vehicle.fuelEfficiency,
          distanceKm,
        );
      }),
    );

    return {
      tripId,

      distanceKm: Number(distanceKm.toFixed(2)),

      vehicles,
    };
  }

  /**
   * Creates a common response when the cost
   * cannot be calculated.
   */
  private createUnavailableVehicleCost(
    tripVehicleId: string,
    vehicleId: string,
    vehicleName: string,
    fuelType: "PETROL" | "DIESEL" | "ELECTRIC" | "OTHER",
    fuelEfficiency: number,
    distanceKm: number,
  ): ITripVehicleCost {
    return {
      tripVehicleId,

      vehicleId,

      vehicleName,

      fuelType,

      fuelEfficiency,

      distanceKm: Number(distanceKm.toFixed(2)),

      requiredEnergy: null,

      energyPrice: null,

      estimatedCost: null,

      priceUnit: null,

      priceLocation: null,

      pricingSource: null,

      costStatus: "UNAVAILABLE",
    };
  }
}

import { z } from "zod";

const vehicleFields = {
  name: z
    .string()
    .trim()
    .min(2, "Vehicle name must be at least 2 characters")
    .max(50, "Vehicle name must not exceed 50 characters"),

  type: z.enum(["CAR", "BIKE", "SUV", "BUS", "VAN", "TRAVELLER", "TAXI", "AUTO", "OTHER"], {
    message: "Invalid vehicle type",
  }),

  fuelType: z.enum(["PETROL", "DIESEL", "ELECTRIC", "CNG", "OTHER"], {
    message: "Invalid fuel type",
  }),

  fuelEfficiency: z
    .number({
      message: "Fuel Efficiency must be a number",
    })
    .positive("Fuel Efficiency must be greater than 0"),

  seatingCapacity: z
    .number({
      message: "Seating capacity must be a number",
    })
    .int("Seating capacity must be a whole number")
    .min(1, "Seating capacity must be at least 1")
    .max(100, "Seating capacity cannot exceed 100"),

  additionalDetails: z
    .string()
    .trim()
    .max(300, "Additional details must not exceed 300 characters")
    .optional(),
};

export const createVehicleSchema = z.object({
  body: z.object(vehicleFields),
});

export const updateVehicleSchema = z.object({
  body: z.object(vehicleFields).partial(),
});

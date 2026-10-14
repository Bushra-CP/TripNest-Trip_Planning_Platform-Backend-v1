import { IItineraryTemplate } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import mongoose, { Schema, type Model } from "mongoose";

const itineraryStopSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
    },
    startTime: {
      type: String,
    },
    durationMinutes: {
      type: Number,
    },
  },
  {
    _id: false,
  },
);

const itineraryDaySchema = new Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    stops: {
      type: [itineraryStopSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const itineraryTemplateSchema = new Schema<IItineraryTemplate>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    source: {
      type: String,
      required: true,
      trim: true,
    },

    destinations: {
      type: [String],
      required: true,
      default: [],
    },

    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },

    travelMode: {
      type: String,
      required: true,
    },

    tripType: {
      type: String,
      required: true,
    },

    preferences: {
      type: [String],
      default: [],
    },

    days: {
      type: [itineraryDaySchema],
      default: [],
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ItineraryTemplateModel: Model<IItineraryTemplate> = mongoose.model<IItineraryTemplate>(
  "ItineraryTemplate",
  itineraryTemplateSchema,
);

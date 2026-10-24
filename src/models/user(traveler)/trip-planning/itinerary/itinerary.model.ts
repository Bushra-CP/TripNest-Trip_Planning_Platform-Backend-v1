import { IItinerary } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
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
    activityType: {
      type: String,
      trim: true,
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

const itinerarySchema = new Schema<IItinerary>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    threadId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    templateId: {
      type: Schema.Types.ObjectId,
      ref: "ItineraryTemplate",
    },

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

    numberOfTravelers: {
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

    mustVisitPlaces: {
      type: [String],
      default: [],
    },

    preferredActivities: {
      type: [String],
      default: [],
    },

    excludedPlaces: {
      type: [String],
      default: [],
    },

    excludedActivityTypes: {
      type: [String],
      default: [],
    },

    budget: {
      type: Number,
      default: null,
      min: 0,
    },

    startDate: {
      type: String,
      default: null,
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
  },
  {
    timestamps: true,
  },
);

export const ItineraryModel: Model<IItinerary> = mongoose.model<IItinerary>(
  "Itinerary",
  itinerarySchema,
);

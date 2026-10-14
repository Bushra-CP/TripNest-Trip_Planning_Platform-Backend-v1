import { IItineraryChunk } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import mongoose, { Schema, type Model } from "mongoose";

const itineraryChunkSchema = new Schema<IItineraryChunk>(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "ItineraryTemplate",
      required: true,
      index: true,
    },

    version: {
      type: Number,
      required: true,
      min: 1,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },

    metadata: {
      source: {
        type: String,
        required: true,
      },

      destinations: {
        type: [String],
        default: [],
      },

      totalDays: {
        type: Number,
        required: true,
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

// Avoid duplicate chunks for the same template version.
itineraryChunkSchema.index({ templateId: 1, version: 1, chunkIndex: 1 }, { unique: true });

export const ItineraryChunkModel: Model<IItineraryChunk> = mongoose.model<IItineraryChunk>(
  "ItineraryChunk",
  itineraryChunkSchema,
);

import { KnowledgeChunk } from "@/interfaces/IModel/knowledge-document.interfaces";
import mongoose, { Schema, type Model } from "mongoose";

const knowledgeChunkSchema = new Schema<KnowledgeChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeDocument",
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      default: null,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    places: {
      type: [String],
      default: [],
    },

    attractions: {
      type: [String],
      default: [],
    },

    activities: {
      type: [String],
      default: [],
    },

    accommodation: {
      type: [String],
      default: [],
    },

    restaurants: {
      type: [String],
      default: [],
    },

    cuisine: {
      type: [String],
      default: [],
    },

    transportation: {
      type: [String],
      default: [],
    },

    events: {
      type: [String],
      default: [],
    },

    festivals: {
      type: [String],
      default: [],
    },

    weather: {
      type: [String],
      default: [],
    },

    bestTimeToVisit: {
      type: [String],
      default: [],
    },

    travelTips: {
      type: [String],
      default: [],
    },

    safety: {
      type: [String],
      default: [],
    },

    budget: {
      type: [String],
      default: [],
    },

    topics: {
      type: [String],
      default: [],
    },

    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const KnowledgeChunkModel: Model<KnowledgeChunk> = mongoose.model<KnowledgeChunk>(
  "KnowledgeChunk",
  knowledgeChunkSchema,
);

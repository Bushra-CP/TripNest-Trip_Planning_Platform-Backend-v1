import { Document, Types } from "mongoose";

// Individual day in an itinerary
export interface IItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  stops: IItineraryStop[];
}

// Individual attraction or activity
export interface IItineraryStop {
  name: string;
  description: string;
  location?: string | undefined;
  startTime?: string | undefined;
  durationMinutes?: number | undefined;
}

// User's personal itinerary
export interface IItinerary extends Document {
  tripId: Types.ObjectId;
  threadId: string;

  userId?: Types.ObjectId | null;
  templateId?: Types.ObjectId;

  title: string;
  source: string;
  destinations: string[];

  totalDays: number;
  numberOfTravelers: number;

  travelMode: string;
  tripType: string;
  preferences: string[];

  budget: number | null;
  startDate: string | null;

  days: IItineraryDay[];

  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Shared itinerary template used by RAG
export interface IItineraryTemplate extends Document {
  title: string;
  source: string;
  destinations: string[];

  totalDays: number;
  travelMode: string;
  tripType: string;
  preferences: string[];

  days: IItineraryDay[];

  version: number;
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

// Searchable chunk of a shared itinerary template
export interface IItineraryChunk extends Document {
  templateId: Types.ObjectId;
  version: number;
  chunkIndex: number;

  content: string;
  embedding: number[];

  metadata: {
    source: string;
    destinations: string[];
    totalDays: number;
    travelMode: string;
    tripType: string;
    preferences: string[];
  };

  isActive: boolean;
}

import { injectable } from "inversify";

import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";

@injectable()
export class TripDateService {
  /**
   * Converts relative dates like "tomorrow"
   * into an actual YYYY-MM-DD date.
   */
  public resolveStartDate(requirements: TripRequirements): TripRequirements {
    if (!requirements.startDate) {
      return requirements;
    }

    return {
      ...requirements,
      startDate: this.resolveDate(requirements.startDate),
    };
  }

  private resolveDate(dateValue: string): string {
    const normalizedDate = dateValue.trim().toLowerCase();

    const today = new Date();

    // Remove the time portion.
    today.setHours(0, 0, 0, 0);

    if (normalizedDate === "today") {
      return this.formatDate(today);
    }

    if (normalizedDate === "tomorrow") {
      today.setDate(today.getDate() + 1);

      return this.formatDate(today);
    }

    if (normalizedDate === "day after tomorrow") {
      today.setDate(today.getDate() + 2);

      return this.formatDate(today);
    }

    const weekdayDate = this.resolveWeekday(normalizedDate);

    if (weekdayDate) {
      return this.formatDate(weekdayDate);
    }

    // If it is already an actual date,
    // keep it unchanged.
    return dateValue;
  }

  private resolveWeekday(dateValue: string): Date | null {
    const weekdays: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    let weekdayName = dateValue;

    if (dateValue.startsWith("next ")) {
      weekdayName = dateValue.replace("next ", "");
    } else if (dateValue.startsWith("this ")) {
      weekdayName = dateValue.replace("this ", "");
    }

    const targetDay = weekdays[weekdayName];

    if (targetDay === undefined) {
      return null;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const currentDay = today.getDay();

    let daysToAdd = targetDay - currentDay;

    // "next Monday" should mean the
    // next occurrence, not today.
    if (dateValue.startsWith("next ") && daysToAdd <= 0) {
      daysToAdd += 7;
    }

    // For "this Monday", if today is Monday,
    // use today.
    if (dateValue.startsWith("this ") && daysToAdd < 0) {
      daysToAdd += 7;
    }

    // If just "Monday" is provided and
    // today is Monday, use today.
    if (!dateValue.startsWith("next ") && !dateValue.startsWith("this ") && daysToAdd < 0) {
      daysToAdd += 7;
    }

    const result = new Date(today);

    result.setDate(result.getDate() + daysToAdd);

    return result;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
}

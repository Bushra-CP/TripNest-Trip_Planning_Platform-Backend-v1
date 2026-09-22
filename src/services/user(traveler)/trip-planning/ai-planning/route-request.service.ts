import { ChatGroq } from "@langchain/groq";
import { injectable } from "inversify";

import { env } from "@/config/env";

export type RequestRoute = "knowledge" | "none";

@injectable()
export class RouteRequestService {
  private readonly model: ChatGroq;

  constructor() {
    this.model = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
      temperature: 0,
      maxRetries: 3,
    });
  }

  public async decideRoute(userMessage: string): Promise<RequestRoute> {
    const response = await this.model.invoke([
      [
        "system",
        `Decide whether the user's message requires
specific travel knowledge from the TripNest
knowledge base.

Return ONLY one of these two values:

knowledge
none

Use "knowledge" when the user is asking for
specific travel information such as destinations,
places to visit, activities, food, transportation,
weather information stored in the knowledge base,
travel tips, safety information, or similar
travel facts.

Use "none" when the user is only providing or
changing trip-planning information such as
destination, source, dates, budget, travelers,
travel mode, preferences, or other trip details.

Do not explain your answer.`,
      ],
      ["human", userMessage],
    ]);

    const route = response.text.trim().toLowerCase();

    if (route === "knowledge") {
      return "knowledge";
    }

    return "none";
  }
}

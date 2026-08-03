import { ILogger } from "@/shared/logger/ILogger";
import { Container } from "inversify";
import { TYPES } from "../types";
import { WinstonLogger } from "@/shared/logger/WinstonLogger";

export function registerLogger(container: Container): void {
  container.bind<ILogger>(TYPES.Logger).to(WinstonLogger).inSingletonScope();
}

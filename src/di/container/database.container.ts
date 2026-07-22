import { Container } from "inversify";
import { IDatabaseService } from "../../infrastructure/database/IDatabaseService.js";
import { TYPES } from "../types.js";
import { DatabaseService } from "../../infrastructure/database/databse.service.js";

export function registerDatabase(container: Container): void {
  container
    .bind<IDatabaseService>(TYPES.DatabaseService)
    .to(DatabaseService)
    .inSingletonScope();
}

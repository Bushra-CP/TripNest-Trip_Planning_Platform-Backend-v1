import { Container } from "inversify";
import { IDatabaseService } from "../../infrastructure/database/IDatabaseService";
import { TYPES } from "../types";
import { DatabaseService } from "../../infrastructure/database/databse.service";

export function registerDatabase(container: Container): void {
  container.bind<IDatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
}

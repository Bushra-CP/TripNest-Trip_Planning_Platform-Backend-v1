import { Container } from "inversify";
import { TYPES } from "../types";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { ErrorMiddleware } from "@/middleware/error.middleware";

export function registerMiddleware(container: Container): void {
  container.bind<ErrorMiddleware>(TYPES.ErrorMiddleware).to(ErrorMiddleware);

  container.bind<AuthenticateMiddleware>(TYPES.AuthenticateMiddleware).to(AuthenticateMiddleware);

  container.bind<AuthorizeMiddleware>(TYPES.AuthorizeMiddleware).to(AuthorizeMiddleware);
}

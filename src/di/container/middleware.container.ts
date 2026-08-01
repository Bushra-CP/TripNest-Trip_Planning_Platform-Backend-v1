import { Container } from "inversify";
import { TYPES } from "../types.js";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware.js";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware.js";

export function registerMiddleware(container: Container): void {
  container.bind<AuthenticateMiddleware>(TYPES.AuthenticateMiddleware).to(AuthenticateMiddleware);

  container.bind<AuthorizeMiddleware>(TYPES.AuthorizeMiddleware).to(AuthorizeMiddleware);
}

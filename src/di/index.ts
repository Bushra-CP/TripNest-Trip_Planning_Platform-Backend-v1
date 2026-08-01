import { Container } from "inversify";
import { registerIntegrationsContainer } from "./container/integrations.container.js";
import { registerUserRegContainer } from "./container/userRegister.container.js";
import { registerOTP } from "./container/otp.container.js";
import { registerDatabase } from "./container/database.container.js";
import { authContainer } from "./container/auth.container.js";
import { registerMiddleware } from "./container/middleware.container.js";

const container = new Container();

authContainer(container);

registerIntegrationsContainer(container);

registerUserRegContainer(container);

registerOTP(container);

registerDatabase(container);

registerMiddleware(container);

export { container };

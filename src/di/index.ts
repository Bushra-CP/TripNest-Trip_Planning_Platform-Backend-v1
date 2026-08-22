import { Container } from "inversify";
import { registerIntegrationsContainer } from "./container/integrations.container";
import { registerUserRegContainer } from "./container/userRegister.container";
import { registerOTP } from "./container/otp.container";
import { registerDatabase } from "./container/database.container";
import { authContainer } from "./container/auth.container";
import { registerMiddleware } from "./container/middleware.container";
import { registerLogger } from "./container/logger.container";
import { registerUserManagementContainer } from "./container/user-management.container";
import { registerTripPlanning } from "./container/trip-planning.container";
import { registerSocket } from "./container/socket.container";

const container = new Container();

authContainer(container);

registerIntegrationsContainer(container);

registerUserRegContainer(container);

registerOTP(container);

registerDatabase(container);

registerMiddleware(container);

registerLogger(container);

registerUserManagementContainer(container);

registerTripPlanning(container);

registerSocket(container);

export { container };

import { Container } from "inversify";
import { registerIntegrationsContainer } from "./container/integrations.container.js";
import { registerUserRegContainer } from "./container/userRegister.container.js";
import { registerOTP } from "./container/otp.container.js";
import { registerDatabase } from "./container/database.container.js";

const container = new Container();

registerIntegrationsContainer(container);

registerUserRegContainer(container);

registerOTP(container);

registerDatabase(container)

export { container };

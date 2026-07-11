import { Container } from "inversify";

import { registerAuth } from "./auth.container";

import { registerShared } from "./shared.container";

const container = new Container();

registerShared(container);

registerAuth(container);

export { container };
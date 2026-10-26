import "server-only";

import { createSessionGateway } from "./session-gateway";

let gateway: ReturnType<typeof createSessionGateway> | undefined;

export function getSessionGateway() {
  // Lazy startup: importing a route during build never opens Redis.
  gateway ??= createSessionGateway({ ...process.env });
  return gateway;
}

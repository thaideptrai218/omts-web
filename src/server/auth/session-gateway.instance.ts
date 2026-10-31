import "server-only";

import { createApiSessionGateway } from "./api-session-gateway";

let gateway: ReturnType<typeof createApiSessionGateway> | undefined;

export function getSessionGateway() {
  // Lazy startup: importing a route during build never opens Redis.
  gateway ??= createApiSessionGateway({ ...process.env });
  return gateway;
}

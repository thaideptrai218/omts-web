import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { createSessionHttpHandlers } from "@/server/auth/session-http";

export async function POST(request: Request) {
  return createSessionHttpHandlers(process.env, getSessionGateway()).recover(request);
}

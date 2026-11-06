import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { createSessionHttpHandlers } from "@/server/auth/session-http";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  return createSessionHttpHandlers(process.env, getSessionGateway()).read(request);
}

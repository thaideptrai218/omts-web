import { connection } from "next/server";
import type { ReactNode } from "react";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
export async function ApiPage({ api, children }: { api: ReactNode; children: ReactNode }) {
  await connection();
  return getSessionGateway().mode === "mock" ? children : api;
}

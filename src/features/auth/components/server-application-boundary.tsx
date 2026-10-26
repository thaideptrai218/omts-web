import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { AppSessionShell } from "./app-session-shell";
import { SessionServiceState } from "./session-service-state";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { requireApplicationPage } from "@/server/auth/next-session-access";

async function ApplicationAccess({ children }: { children: ReactNode }) {
  await connection();
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return <AppSessionShell>{children}</AppSessionShell>;
  const result = await requireApplicationPage();
  if (result.status !== "ready") return <main><SessionServiceState /></main>;
  // W3 hydration and feature API adapters must land before mounting existing
  // mock-backed pages under a real session. Keep the API branch closed meanwhile.
  return <main><SessionServiceState /></main>;
}

export function ServerApplicationBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center p-6" role="status">Đang kiểm tra phiên đăng nhập...</main>}>
      <ApplicationAccess>{children}</ApplicationAccess>
    </Suspense>
  );
}

import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { AppSessionShell } from "./app-session-shell";
import { SessionServiceState } from "./session-service-state";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { requireApplicationPage } from "@/server/auth/next-session-access";
import { ApiWorkspaceShell } from "@/features/api-workspace/api-workspace-shell";

async function ApplicationAccess({ children }: { children: ReactNode }) {
  await connection();
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return <AppSessionShell>{children}</AppSessionShell>;
  const result = await requireApplicationPage();
  if (result.status !== "ready") return <main><SessionServiceState /></main>;
  return <ApiWorkspaceShell context={result.context}>{children}</ApiWorkspaceShell>;
}

export function ServerApplicationBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center p-6" role="status">Đang kiểm tra phiên đăng nhập...</main>}>
      <ApplicationAccess>{children}</ApplicationAccess>
    </Suspense>
  );
}

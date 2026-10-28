import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { requireOnboardingPage } from "@/server/auth/next-session-access";
import type { SessionPhase } from "@/server/auth/session-store";
import { SessionServiceState } from "./session-service-state";
import { ApiSecurityGate } from "./api-security-gate";

type Phase = Exclude<SessionPhase, "application">;

async function OnboardingAccess({ phase }: { phase: Phase }) {
  await connection();
  if (getSessionGateway().mode === "mock") redirect("/login");
  const access = await requireOnboardingPage(phase);
  const title = phase === "password-change-required" ? "Đổi mật khẩu tạm thời" : "Xác minh thông tin liên hệ";
  return access.status === "ready" ? <ApiSecurityGate phase={phase} /> : <SessionServiceState title={title} />;
}

export function OnboardingRouteBoundary({ phase }: { phase: Phase }) {
  return <Suspense fallback={<p role="status">Đang kiểm tra phiên đăng nhập...</p>}><OnboardingAccess phase={phase} /></Suspense>;
}

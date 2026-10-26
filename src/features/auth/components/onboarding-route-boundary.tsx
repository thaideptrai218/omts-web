import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { requireOnboardingPage } from "@/server/auth/next-session-access";
import type { SessionPhase } from "@/server/auth/session-store";
import { SessionServiceState } from "./session-service-state";

type Phase = Exclude<SessionPhase, "application">;

async function OnboardingAccess({ phase }: { phase: Phase }) {
  await connection();
  if (getSessionGateway().mode === "mock") redirect("/login");
  await requireOnboardingPage(phase);
  const title = phase === "password-change-required" ? "Đổi mật khẩu tạm thời" : "Xác minh thông tin liên hệ";
  // Backend onboarding mutation alignment is tracked in W3.3.
  return <SessionServiceState title={title} />;
}

export function OnboardingRouteBoundary({ phase }: { phase: Phase }) {
  return <Suspense fallback={<p role="status">Đang kiểm tra phiên đăng nhập...</p>}><OnboardingAccess phase={phase} /></Suspense>;
}

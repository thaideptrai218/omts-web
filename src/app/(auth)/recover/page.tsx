import type { Metadata } from "next";

import { RecoveryExperience } from "@/features/account-recovery/components/recovery-experience";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { SessionServiceState } from "@/features/auth/components/session-service-state";
import { Suspense } from "react";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Khôi phục tài khoản | OMTS",
};

async function RecoverContent() {
  await connection();
  if (getSessionGateway().mode !== "mock") return <SessionServiceState title="Chưa thể khôi phục tài khoản" />;
  return <RecoveryExperience />;
}

export default function RecoverPage() {
  return <Suspense fallback={<p role="status">Đang tải trang khôi phục...</p>}><RecoverContent /></Suspense>;
}

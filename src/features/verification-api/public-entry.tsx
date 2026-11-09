import { redirect } from "next/navigation";
import { readRequestPhase, readRequestSession } from "@/server/auth/next-session-access";
import { sessionDestination } from "@/server/auth/session-destinations";
import { SessionServiceState } from "@/features/auth/components/session-service-state";
import { VerificationPanel } from "./verification-panel";
export async function PublicVerificationEntry({ purpose }: { purpose: "recovery" }) {
  const session = await readRequestSession();
  if (session.status === "invalid-session") redirect("/session/recover");
  if (session.status === "resolved") {
    // An unexpired cookie is not proof of a session: the API decides whether to send the user onward.
    const phase = await readRequestPhase();
    if (phase.status === "ready") redirect(sessionDestination(phase.phase));
    if (phase.status === "unauthenticated") redirect("/session/recover");
  }
  if (session.status !== "anonymous") return <SessionServiceState title="Chưa thể xác minh tài khoản" />;
  return <div className="space-y-4 rounded-card border border-border bg-surface p-6 sm:p-8"><VerificationPanel purpose={purpose} /><a className="inline-block font-semibold text-primary underline" href="/login">Về đăng nhập</a></div>;
}

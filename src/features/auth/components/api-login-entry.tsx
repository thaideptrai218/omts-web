import { redirect } from "next/navigation";
import { readRequestPhase, readRequestSession } from "@/server/auth/next-session-access";
import { sessionDestination } from "@/server/auth/session-destinations";
import { SessionServiceState } from "./session-service-state";
import { ApiLoginForm } from "./api-login-form";

export async function ApiLoginEntry() {
  const session = await readRequestSession();
  if (session.status === "invalid-session") redirect("/session/recover");
  if (session.status === "anonymous") return <ApiLoginForm />;
  if (session.status === "resolved") {
    // An unexpired cookie is not proof of a session: ask the API before sending the user onward.
    const phase = await readRequestPhase();
    if (phase.status === "ready") redirect(sessionDestination(phase.phase));
    if (phase.status === "unauthenticated") redirect("/session/recover");
  }
  return <SessionServiceState title="Chưa thể đăng nhập" />;
}

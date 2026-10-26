import { redirect } from "next/navigation";
import { readRequestSession } from "@/server/auth/next-session-access";
import { sessionDestination } from "@/server/auth/session-destinations";
import { SessionServiceState } from "./session-service-state";

export async function ApiLoginEntry() {
  const result = await readRequestSession();
  if (result.status === "resolved") redirect(sessionDestination(result.session.phase));
  if (result.status === "invalid-session") redirect("/session/recover");
  // W3 owns the real credentials adapter. Never run mock login in API mode.
  return <SessionServiceState title="Chưa thể đăng nhập" />;
}

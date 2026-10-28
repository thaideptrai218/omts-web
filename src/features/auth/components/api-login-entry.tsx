import { redirect } from "next/navigation";
import { readRequestSession } from "@/server/auth/next-session-access";
import { sessionDestination } from "@/server/auth/session-destinations";
import { SessionServiceState } from "./session-service-state";
import { ApiLoginForm } from "./api-login-form";

export async function ApiLoginEntry() {
  const result = await readRequestSession();
  if (result.status === "resolved") redirect(sessionDestination(result.session.phase));
  if (result.status === "invalid-session") redirect("/session/recover");
  if (result.status === "anonymous") return <ApiLoginForm />;
  return <SessionServiceState title="Chưa thể đăng nhập" />;
}

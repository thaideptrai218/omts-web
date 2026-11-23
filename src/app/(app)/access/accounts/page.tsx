import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccountManagementExperience } from "@/features/account-management/components/account-management-experience";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";

// Auth is currently restored on the client, so this protected page cannot join
// the prerendered instant-navigation shell until the server session is defined.
export const instant = false;

/**
 * One URL family: with the real API this address forwards to /workspace/accounts (the "Quản lý người dùng" screen), keeping
 * `?accountId=` so links from notifications and the employee unlink follow-up still open that user. The mock data source keeps its demo screen.
 */
export default async function AccountManagementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  if (getSessionGateway().mode === "mock") return <AccountManagementExperience />;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  redirect(`/workspace/accounts${query.size ? `?${query}` : ""}`);
}

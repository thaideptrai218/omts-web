import { notFound, redirect } from "next/navigation";
import { resourceKeys } from "@/features/api-workspace/resources";
import type { ResourceKey } from "@/features/api-workspace/resources";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";
import { EmployeeAccountLinkRedirect } from "@/features/employee-api/employee-account-link-redirect";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { connection } from "next/server";

// Session-dependent (cookie-restored) segment: same blocking opt-out as operations/[area].
export const instant = false;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function WorkspaceResourcePage({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { resource } = await params;
  if (getSessionGateway().mode !== "api" || !resourceKeys.includes(resource as ResourceKey)) notFound();
  // The input catalogue has its own screen under Vật tư & Giống.
  if (resource === "input-items") redirect("/inputs/items");
  // Accounts and roles are managed from the Nhân viên screen now; old links still work. A single valid ?accountId= opens the employee who holds that login.
  if (resource === "roles") redirect("/workspace/employees");
  if (resource === "accounts") {
    const accountId = (await searchParams).accountId;
    if (typeof accountId === "string" && UUID_PATTERN.test(accountId)) return <EmployeeAccountLinkRedirect accountId={accountId} />;
    redirect("/workspace/employees");
  }
  return <ApiResourceScreen key={resource} resource={resource as ResourceKey} />;
}

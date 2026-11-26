import { notFound, redirect } from "next/navigation";
import { resourceKeys } from "@/features/api-workspace/resources";
import type { ResourceKey } from "@/features/api-workspace/resources";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { connection } from "next/server";

// Session-dependent (cookie-restored) segment: same blocking opt-out as operations/[area].
export const instant = false;
export default async function WorkspaceResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  await connection();
  const { resource } = await params;
  if (getSessionGateway().mode !== "api" || !resourceKeys.includes(resource as ResourceKey)) notFound();
  // The input catalogue has its own screen under Vật tư & Giống.
  if (resource === "input-items") redirect("/inputs/items");
  return <ApiResourceScreen key={resource} resource={resource as ResourceKey} />;
}

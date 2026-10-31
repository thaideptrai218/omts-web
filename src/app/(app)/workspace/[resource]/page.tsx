import { notFound } from "next/navigation";
import { resourceKeys } from "@/features/api-workspace/resources";
import type { ResourceKey } from "@/features/api-workspace/resources";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { connection } from "next/server";

export default async function WorkspaceResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  await connection();
  const { resource } = await params;
  if (getSessionGateway().mode !== "api" || !resourceKeys.includes(resource as ResourceKey)) notFound();
  return <ApiResourceScreen key={resource} resource={resource as ResourceKey} />;
}

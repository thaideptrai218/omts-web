import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { PlanEditorPage } from "@/features/harvest-plans/plan-editor";
export const instant = false;
/** `?order=<id>` (repeatable) starts the plan for those orders; `?copy=<id>` starts from another plan. */
export default async function Page({ searchParams }: { searchParams: Promise<{ order?: string | string[]; copy?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { order, copy } = await searchParams;
  const orderIds = (Array.isArray(order) ? order : order ? [order] : []).slice(0, 20);
  return <PlanEditorPage key={`${copy ?? ""}|${orderIds.join(",")}`} copyFrom={copy} orderIds={orderIds} />;
}

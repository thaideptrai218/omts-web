import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { OrderEditorPage } from "@/features/sales-orders/order-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string; request?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy, request } = await searchParams;
  return <OrderEditorPage key={copy ?? request ?? "new"} copyFrom={copy} requestId={request} />;
}

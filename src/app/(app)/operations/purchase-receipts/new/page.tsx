import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { ReceiptEditorPage } from "@/features/purchase-documents/receipt-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string; item?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy, item } = await searchParams;
  return <ReceiptEditorPage key={`${copy ?? "new"}:${item ?? ""}`} copyFrom={copy} itemId={copy ? undefined : item} />;
}

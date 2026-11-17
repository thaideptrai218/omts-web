import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { ReturnEditorPage } from "@/features/purchase-documents/return-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ receipt?: string; line?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { receipt, line } = await searchParams;
  return <ReturnEditorPage key={`${receipt ?? "free"}:${line ?? ""}`} kind="Supply" receiptId={receipt} lineId={receipt ? line : undefined} />;
}

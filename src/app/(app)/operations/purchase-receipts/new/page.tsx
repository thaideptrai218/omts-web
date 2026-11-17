import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { LegacyReceiptNewRedirect } from "@/features/purchase-documents/legacy-redirects";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string; item?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy, item } = await searchParams;
  return <LegacyReceiptNewRedirect copy={copy} item={copy ? undefined : item} />;
}

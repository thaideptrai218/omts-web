import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { LegacyReturnNewRedirect } from "@/features/purchase-documents/legacy-redirects";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ receipt?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { receipt } = await searchParams;
  return <LegacyReturnNewRedirect receipt={receipt} />;
}

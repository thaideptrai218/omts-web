import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { DisposalEditorPage } from "@/features/product-disposals/disposal-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy } = await searchParams;
  return <DisposalEditorPage key={copy ?? "new"} copyFrom={copy} />;
}

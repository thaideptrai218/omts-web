import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { DisposalEditorPage } from "@/features/product-disposals/disposal-editor";
export const instant = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { id } = await params;
  return <DisposalEditorPage key={id} id={id} />;
}

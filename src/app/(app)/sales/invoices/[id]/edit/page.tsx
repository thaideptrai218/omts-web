import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { InvoiceEditorPage } from "@/features/sales-invoice-editor/invoice-editor";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
export const instant = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { id } = await params, invoiceId = z.guid().safeParse(id);
  if (!invoiceId.success) notFound();
  return <InvoiceEditorPage key={invoiceId.data} invoiceId={invoiceId.data} />;
}

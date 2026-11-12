import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { InvoiceEditorPage } from "@/features/sales-invoice-editor/invoice-editor";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
export const instant = false;
/** A new invoice is always made from an order: `?order=<id>` comes from "Xử lý đặt hàng". */
export default async function Page({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { order } = await searchParams, orderId = z.guid().safeParse(order);
  if (!orderId.success) notFound();
  return <InvoiceEditorPage key={orderId.data} orderId={orderId.data} />;
}

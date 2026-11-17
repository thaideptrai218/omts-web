import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { InvoiceEditorPage } from "@/features/sales-invoice-editor/invoice-editor";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
export const instant = false;
/** A new invoice is always made from an order: `?order=<id>` comes from "Xử lý đặt hàng"; `&lot=<id>` (from Lô thu hoạch) starts the lines on that lot. */
export default async function Page({ searchParams }: { searchParams: Promise<{ order?: string; lot?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { order, lot } = await searchParams, orderId = z.guid().safeParse(order), lotId = z.guid().safeParse(lot);
  if (!orderId.success) notFound();
  const picked = lotId.success ? lotId.data : undefined;
  return <InvoiceEditorPage key={`${orderId.data}:${picked ?? ""}`} orderId={orderId.data} lotId={picked} />;
}

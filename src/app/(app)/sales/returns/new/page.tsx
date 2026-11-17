import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { ReturnEditorPage } from "@/features/sales-returns/return-editor";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
export const instant = false;
/** A sales return is made from one invoice: `?invoice=HD000123` (its code; an id is read too). Without it there is nothing to return. */
export default async function Page({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { invoice } = await searchParams, reference = z.string().trim().min(1).max(60).safeParse(invoice);
  if (!reference.success) notFound();
  return <ReturnEditorPage key={reference.data} invoice={reference.data} />;
}

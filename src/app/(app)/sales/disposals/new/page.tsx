import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { DisposalEditorPage } from "@/features/product-disposals/disposal-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string; lot?: string; zone?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy, lot, zone } = await searchParams;
  // `?lot=<id>&zone=<id>` comes from Lô thu hoạch "Xuất hủy": the disposal starts on that lot.
  const lotId = z.guid().safeParse(lot), zoneId = z.guid().safeParse(zone);
  const fromLot = !copy && lotId.success && zoneId.success ? { id: lotId.data, zoneId: zoneId.data } : undefined;
  return <DisposalEditorPage key={copy ?? fromLot?.id ?? "new"} copyFrom={copy} fromLot={fromLot} />;
}

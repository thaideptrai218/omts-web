import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { LegacyItemsRedirect } from "@/features/purchase-documents/legacy-redirects";
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><LegacyItemsRedirect /></Suspense>;
}

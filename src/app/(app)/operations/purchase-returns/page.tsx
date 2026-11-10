import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { PurchaseReturnsScreen } from "@/features/purchase-documents/returns-screen";
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><PurchaseReturnsScreen /></Suspense>;
}

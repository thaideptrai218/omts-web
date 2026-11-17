import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { PurchaseReceiptsScreen } from "@/features/purchase-documents/receipts-screen";
export const metadata: Metadata = { title: "Nhập giống | HTX Trung Nam" };
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><PurchaseReceiptsScreen kind="Seed" /></Suspense>;
}

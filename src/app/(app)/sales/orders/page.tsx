import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { OrdersScreen } from "@/features/sales-orders/orders-screen";
export const metadata: Metadata = { title: "Đặt hàng | HTX Trung Nam" };
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><OrdersScreen /></Suspense>;
}

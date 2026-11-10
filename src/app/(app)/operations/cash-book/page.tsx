import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { CashBookScreen } from "@/features/cash-book/cash-book-screen";
export const metadata: Metadata = { title: "Sổ quỹ | HTX Trung Nam" };
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><CashBookScreen /></Suspense>;
}

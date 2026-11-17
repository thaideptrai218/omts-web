import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { PlansScreen } from "@/features/harvest-plans/plans-screen";
export const metadata: Metadata = { title: "Kế hoạch thu hoạch | HTX Trung Nam" };
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><PlansScreen /></Suspense>;
}

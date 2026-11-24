import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { LotsScreen } from "@/features/harvest-lots/lots-screen";
export const metadata: Metadata = { title: "Lô thu hoạch" };
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><LotsScreen /></Suspense>;
}

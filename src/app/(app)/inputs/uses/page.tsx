import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { IssuesScreen } from "@/features/input-issues/issues-screen";
export const metadata: Metadata = { title: "Xuất dùng | HTX Trung Nam" };
export const instant = false;
export default async function Page() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <Suspense><IssuesScreen kind="Use" /></Suspense>;
}

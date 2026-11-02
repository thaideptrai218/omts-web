import { notFound } from "next/navigation";
import { connection } from "next/server";
import { operationAreas, type OperationArea } from "@/features/operations/permissions";
import { OperationScreen } from "@/features/operations/operation-screen";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { DemoWorkforceScreen } from "@/features/workforce-demo/screen";
// The client-restored demo session intentionally withholds this segment.
export const instant = false;
export default async function OperationsPage({ params }: { params: Promise<{ area: string }> }) {
  await connection();
  const { area } = await params;
  if (!operationAreas.includes(area as OperationArea)) notFound();
  if (getSessionGateway().mode !== "api") {
    if (area !== "workforce") notFound();
    return <DemoWorkforceScreen />;
  }
  return <OperationScreen key={area} area={area as OperationArea} />;
}

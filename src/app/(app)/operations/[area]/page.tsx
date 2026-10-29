import { notFound } from "next/navigation";
import { connection } from "next/server";
import { operationAreas, type OperationArea } from "@/features/operations/permissions";
import { OperationScreen } from "@/features/operations/operation-screen";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
export default async function OperationsPage({ params }: { params: Promise<{ area: string }> }) {
  await connection();
  const { area } = await params;
  if (getSessionGateway().mode !== "api" || !operationAreas.includes(area as OperationArea)) notFound();
  return <OperationScreen key={area} area={area as OperationArea} />;
}

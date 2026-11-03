import { notFound } from "next/navigation";
import { connection } from "next/server";
import { operationAreas, type OperationArea } from "@/features/operations/permissions";
import { OperationScreen } from "@/features/operations/operation-screen";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { DemoWorkforceScreen } from "@/features/workforce-demo/screen";
import { DemoPaymentScreen, DemoReceiptScreen } from "@/features/accounting-demo/screen";
// The client-restored demo session intentionally withholds this segment.
export const instant = false;
export default async function OperationsPage({ params }: { params: Promise<{ area: string }> }) {
  await connection();
  const { area } = await params;
  if (!operationAreas.includes(area as OperationArea)) notFound();
  if (getSessionGateway().mode !== "api") {
    if (area === "workforce") return <DemoWorkforceScreen />;
    if (area === "purchase-receipts") return <DemoReceiptScreen />;
    if (area === "supplier-payments") return <DemoPaymentScreen />;
    notFound();
  }
  return <OperationScreen key={area} area={area as OperationArea} />;
}

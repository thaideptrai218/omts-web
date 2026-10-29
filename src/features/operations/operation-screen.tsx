"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed, type OperationArea } from "./permissions";
import { ReceiptScreen } from "./receipt-screen";
import { PaymentScreen } from "./payment-screen";
import { WaterScreen } from "./water-screen";
export function OperationScreen({ area }: { area: OperationArea }) {
  const context = useApiWorkspace();
  if (!operationAllowed(area, context.identity, context.permissions.functionPermissions)) return <p role="alert">Bạn không có quyền xem chức năng này.</p>;
  return area === "purchase-receipts" ? <ReceiptScreen /> : area === "supplier-payments" ? <PaymentScreen /> : <WaterScreen />;
}

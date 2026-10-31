"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed, type OperationArea } from "./permissions";
import { ReceiptScreen } from "./receipt-screen";
import { PaymentScreen } from "./payment-screen";
import { WaterScreen } from "./water-screen";
import { PurchaseRequestsScreen, SalesProductsScreen } from "./new-module-screens";
import { WorkforceScreen } from "./workforce-screen";
import { MyWorkScreen } from "./my-work-screen";
export function OperationScreen({ area }: { area: OperationArea }) {
  const context = useApiWorkspace();
  if (!operationAllowed(area, context.identity, context.permissions.functionPermissions)) return <p role="alert">Bạn không có quyền xem chức năng này.</p>;
  if (area === "sales-products") return <SalesProductsScreen />;
  if (area === "purchase-requests") return <PurchaseRequestsScreen />;
  if (area === "workforce") return <WorkforceScreen />;
  if (area === "my-work") return <MyWorkScreen />;
  return area === "purchase-receipts" ? <ReceiptScreen /> : area === "supplier-payments" ? <PaymentScreen /> : <WaterScreen />;
}

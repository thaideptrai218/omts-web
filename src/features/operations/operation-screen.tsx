"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed, type OperationArea } from "./permissions";
import { ReceiptScreen } from "./receipt-screen";
import { PaymentScreen } from "./payment-screen";
import { WaterScreen } from "./water-screen";
import { PurchaseRequestsScreen } from "./new-module-screens";
import { ProductsScreen } from "@/features/sales-api/products-screen";
import { WorkforceScreen } from "./workforce-screen";
import { MyWorkScreen } from "./my-work-screen";
import { CyclesScreen } from "@/features/cultivation-api/screen";
import { CultivationRecordsScreen } from "@/features/cultivation-api/records-screen";
import { JobTypesScreen } from "@/features/labor-api/job-types-screen";
import { ReceiptsV2Screen, PaymentsV2Screen } from "@/features/purchasing-v2/screens";
export function OperationScreen({ area }: { area: OperationArea }) {
  const context = useApiWorkspace();
  if (!operationAllowed(area, context.identity, context.permissions.functionPermissions)) return <p role="alert">Bạn không có quyền xem chức năng này.</p>;
  if (process.env.NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT === "v2" && area === "purchase-receipts") return <ReceiptsV2Screen />;
  if (process.env.NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT === "v2" && area === "supplier-payments") return <PaymentsV2Screen />;
  if (area === "job-types") return <JobTypesScreen />;
  if (area === "cultivation-cycles") return <CyclesScreen />;
  if (area === "seeding" || area === "material-usages" || area === "harvest") return <CultivationRecordsScreen area={area} />;
  if (area === "sales-products") return <ProductsScreen />;
  if (area === "purchase-requests") return <PurchaseRequestsScreen />;
  if (area === "workforce") return <WorkforceScreen />;
  if (area === "my-work") return <MyWorkScreen />;
  return area === "purchase-receipts" ? <ReceiptScreen /> : area === "supplier-payments" ? <PaymentScreen /> : <WaterScreen />;
}

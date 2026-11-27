"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { kindText } from "@/features/input-items/stock-kind";
import { operationAllowed } from "@/features/operations/permissions";
import { usePurchaseAccess } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import type { SeedLotRow } from "./contracts";

/**
 * What can be done with a seed lot that still has something left. Each action opens the screen that owns it with the lot already chosen:
 * Ươm = a new nursery batch (`/farming/nursery?lot=`), Trả hàng = a new return from the receipt with the line at the quantity still returnable (`…/new?receipt=&line=`).
 * Seed is always nursed before it is hung on a raft, so a seed lot has no Treo: a finished nursery batch of the lot is hung by starting a cycle from it (`cycleFromBatchHref`).
 */
export type SeedLotAction = "nurse" | "return";
export const NURSERY_PATH = "/farming/nursery", RAFTS_PATH = "/farming/rafts";
export const nurseHref = (lotId: string) => `${NURSERY_PATH}?lot=${encodeURIComponent(lotId)}`;
/** The raft screen with the start of a cycle prefilled with this finished nursery batch: the raft is picked there, on its "Chu kỳ nuôi" tab. */
export const cycleFromBatchHref = (batchId: string) => `${RAFTS_PATH}?nurseryBatch=${encodeURIComponent(batchId)}`;
export const returnLotHref = (lot: Pick<SeedLotRow, "id" | "receiptId">) => `${kindText.Seed.returnsPath}/new?receipt=${encodeURIComponent(lot.receiptId)}&line=${encodeURIComponent(lot.id)}`;
const hrefOf = (action: SeedLotAction, lot: SeedLotRow) => action === "nurse" ? nurseHref(lot.id) : returnLotHref(lot);

/** A lot not used yet, or seeded in part, with stock still on hand (`availableQty`, not `remainingQty`, which also counts what is in the nursery): the only lots the actions apply to. A lot in the nursery or at its end offers none. */
export const lotIsOpen = (lot: Pick<SeedLotRow, "state" | "availableQty">) => (lot.state === "Unused" || lot.state === "PartlySeeded") && lot.availableQty > 0;
/** The actions of a lot the account may take, in the order Ươm, Trả hàng. */
export function lotActions(lot: Pick<SeedLotRow, "state" | "availableQty">, allowed: Readonly<Record<SeedLotAction, boolean>>): SeedLotAction[] {
  return lotIsOpen(lot) ? (["nurse", "return"] as const).filter((action) => allowed[action]) : [];
}

const labels: Record<SeedLotAction, string> = { nurse: "Ươm", return: "Trả hàng" };
const icons = { nurse: "product", return: "upload" } as const;

/** The rights of the account for the two actions: the nursery belongs to the cultivation cycles, the return to the purchase receipts. */
export function useSeedLotAccess(): Readonly<Record<SeedLotAction, boolean>> {
  const { identity, permissions } = useApiWorkspace(), purchase = usePurchaseAccess();
  return {
    nurse: operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "Create"),
    return: purchase.create,
  };
}

/**
 * The footer of a tab of the lot: the actions that fit that tab (`show`), taken from what the lot and the account allow. The first one is the main button.
 * Nothing renders when no action is left, so a closed lot has no empty footer.
 */
export function SeedLotFooter({ lot, show }: { lot: SeedLotRow; show: readonly SeedLotAction[] }) {
  const router = useRouter(), access = useSeedLotAccess();
  const actions = lotActions(lot, access).filter((action) => show.includes(action));
  if (!actions.length) return null;
  return <footer className={listStyles.tabFooter}>
    <div />
    <div>{actions.map((action, index) => <Button key={action} className="w-auto" variant={index === 0 ? "primary" : "secondary"} onClick={() => router.push(hrefOf(action, lot))}>
      <InterfaceIcon name={icons[action]} className="size-4" />{labels[action]}</Button>)}</div>
  </footer>;
}

/** Whether the account may start a cycle, which hangs a finished nursery batch on a raft. */
export function useCanStartCycle(): boolean {
  const { identity, permissions } = useApiWorkspace();
  return operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "Create");
}

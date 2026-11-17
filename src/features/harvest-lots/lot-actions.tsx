"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { useAllowed } from "@/features/cultivation-api/records-shared";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, operationError } from "@/features/operations/ui";
import { useDisposalAccess } from "@/features/products/product-access";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { ORDER } from "@/features/sales-orders/contracts";
import { processOrderHref } from "@/features/sales-orders/order-labels";
import { LOT } from "./contracts";
import { forSale, lotStatusIdOf } from "./lot-labels";
import { lotRepository } from "./repository";
import styles from "./lot-detail.module.css";

type Lot = z.infer<typeof harvestDetail>;
export type LotMode = "view" | "edit" | "weigh" | "close" | "reopen";
export const NEW_DISPOSAL_PATH = "/sales/disposals/new";

/** The orders of the lot's plan that can still be invoiced: an order that is done or cancelled is left out when the API tells its status. */
export const invoiceableOrders = (lot: Lot) => lot.references.salesOrders.filter((order) => order.statusId == null || order.statusId === ORDER.draft || order.statusId === ORDER.delivering);

/** "Lập hóa đơn": one order goes straight to the invoice editor made from it; several orders open a small menu to choose which one. */
function InvoiceButton({ orders, onPick }: { orders: readonly { id: string; code: string }[]; onPick(orderId: string): void }) {
  const [open, setOpen] = useState(false);
  if (orders.length === 1) return <Button className="w-auto" onClick={() => onPick(orders[0].id)}><InterfaceIcon name="receipt" className="size-4" />Lập hóa đơn</Button>;
  return <div className={styles.menuWrap} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <Button className="w-auto" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><InterfaceIcon name="receipt" className="size-4" />Lập hóa đơn</Button>
    {open && <div role="menu" aria-label="Chọn đơn đặt hàng" className={styles.menu}>
      {orders.map((order) => <button key={order.id} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(order.id); }}><span>Lập hóa đơn cho {order.code}</span></button>)}
    </div>}
  </div>;
}

/**
 * The footer of the "Thông tin" tab: the buttons that fit the state of the lot. Each needs the `can*` flag of the API and the right of the account in the zone of the lot.
 * Waiting for weighing: weigh (and correct) · for sale: invoice, weigh again, dispose, close · closed: reopen, unless an invoice closed it (it is reopened by cancelling that invoice).
 * "Lập hóa đơn" opens the invoice editor made from an order of the lot's plan with the lines on this lot; "Xuất hủy" opens a new disposal on this lot, one line per product it still holds.
 */
export function LotInfoActions({ lot, zoneId, onMode, onRemoved }: { lot: Lot; zoneId: string; onMode(mode: LotMode): void; onRemoved(): void }) {
  const router = useRouter(), { notify } = useToast(), confirmation = useActionDialog(), { identity, permissions } = useApiWorkspace(), disposal = useDisposalAccess();
  const allowed = useAllowed("harvest", zoneId), [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const status = lot.statusId ?? lotStatusIdOf(lot.status), mayEdit = allowed("Edit");
  const awaiting = status === LOT.awaitingWeighing, selling = status !== undefined && forSale(status) && lot.figures.remainingKg > 0;
  const orders = invoiceableOrders(lot), mayInvoice = operationAllowed("sales-invoices", identity, permissions.functionPermissions, "Create", zoneId);

  async function remove() {
    const reason = await confirmation.prompt(`Xóa lô ${lot.lotCode}? Lô và các ảnh của lô bị gỡ; nhập lý do xóa, lý do được lưu vào nhật ký.`);
    if (!reason) return;
    setPending(true); setError(undefined);
    const result = await lotRepository.remove(lot.id, zoneId, reason, lot.rowVersion);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa lô ${lot.lotCode}.` }); onRemoved(); } else setError(operationError(result));
  }

  return <>{confirmation.dialog}<ErrorNotice error={error} />
    <footer className={listStyles.tabFooter}>
      <div>{lot.canRemove && allowed("Delete") && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa</Button>}</div>
      <div>
        {awaiting && lot.canWeigh && mayEdit && <Button className="w-auto" onClick={() => onMode("weigh")}><InterfaceIcon name="check" className="size-4" />Cân thực tế</Button>}
        {awaiting && lot.canCorrect && mayEdit && <Button className="w-auto" variant="secondary" onClick={() => onMode("edit")}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
        {selling && mayInvoice && orders.length > 0 && <InvoiceButton orders={orders} onPick={(orderId) => { const href = processOrderHref(orderId); if (href) router.push(`${href}&lot=${lot.id}`); }} />}
        {!awaiting && lot.canWeigh && mayEdit && <Button className="w-auto" variant="secondary" onClick={() => onMode("weigh")}><InterfaceIcon name="refresh" className="size-4" />{lot.weighedKg == null ? "Cân thực tế" : "Cân lại"}</Button>}
        {selling && disposal.create && <Button className="w-auto" variant="secondary" onClick={() => router.push(`${NEW_DISPOSAL_PATH}?lot=${lot.id}&zone=${lot.zoneId}`)}><InterfaceIcon name="upload" className="size-4" />Xuất hủy</Button>}
        {lot.canClose && mayEdit && <Button className="w-auto" variant="secondary" onClick={() => onMode("close")}><InterfaceIcon name="lock" className="size-4" />Đóng lô</Button>}
        {status === LOT.closed && lot.canReopen && mayEdit && !lot.references.closedByInvoice && <Button className="w-auto" onClick={() => onMode("reopen")}><InterfaceIcon name="refresh" className="size-4" />Mở lại</Button>}
      </div>
    </footer></>;
}

/** The footer of the "Thu hoạch" tab: correcting the trip, when the API allows it. */
export function LotHarvestActions({ lot, zoneId, onMode }: { lot: Lot; zoneId: string; onMode(mode: LotMode): void }) {
  const allowed = useAllowed("harvest", zoneId);
  if (!lot.canCorrect || !allowed("Edit")) return null;
  return <footer className={listStyles.tabFooter}><div /><div><Button className="w-auto" onClick={() => onMode("edit")}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button></div></footer>;
}

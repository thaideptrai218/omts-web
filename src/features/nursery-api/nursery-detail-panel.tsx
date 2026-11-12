"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { issueLink } from "@/features/farming-management/entity-links";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Skeleton } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { nurseryStatus, nurseryStatusTone, quantityText, type NurseryDetail } from "./contracts";
import { NurseryEditForm, type NurseryEditGuard } from "./nursery-edit-form";
import { NurseryHistoryTab } from "./nursery-history-tab";
import { nurseryDisplayText } from "./nursery-display-text";
import { NurseryPhotoGallery } from "./nursery-photo-gallery";
import { NurseryUsage } from "./nursery-usage";
import { NurseryInventoryFacts } from "./nursery-inventory-facts";
import { NurseryCloseDialog } from "./nursery-close-dialog";
import { nurseryService } from "./service";
import { useNurseryMutation } from "./use-nursery-mutation";

type Tab = "info" | "photos" | "history";
const tabs: { key: Tab; label: string }[] = [{ key: "info", label: "Thông tin" }, { key: "photos", label: "Ảnh hiện trường" }, { key: "history", label: "Lịch sử" }];
export function NurseryDetailPanel({ id, zoneId, onChanged, onComplete, onCorrect, guard }: {
  id: string; zoneId: string; guard: UnsavedGuard; onChanged(batch: NurseryDetail): void; onComplete(batch: NurseryDetail): void;
  onCorrect(batch: NurseryDetail): void;
}) {
  const detail = useStickyRemote(useCallback((signal: AbortSignal) => nurseryService.detail(id, zoneId, signal), [id, zoneId]));
  const [tab, setTab] = useState<Tab>("info"), [editing, setEditing] = useState(false), [reviewRequested, setReviewRequested] = useState(false);
  const [closing, setClosing] = useState(false);
  const editGuard = useRef<NurseryEditGuard>(null);
  const mutation = useNurseryMutation(), confirmation = useActionDialog(), { identity, permissions } = useApiWorkspace();
  const { pending: pendingRef } = guard;
  useEffect(() => {
    if (!mutation.pending) return;
    pendingRef.current = true;
    return () => { pendingRef.current = false; };
  }, [mutation.pending, pendingRef]);
  const batch = detail.data, prefix = `nursery-${id}`;
  const can = (action: string) => !!batch && operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, action, batch.zoneId);
  const edit = batch?.statusId === 4001 && batch.canEdit && can("Edit"), complete = batch?.statusId === 4001 && batch.canComplete && can("Create");
  const correct = batch?.statusId === 4002 && can("Edit");
  const close = batch?.statusId === 4002 && batch.remaining > 0 && can("Edit");
  const busy = detail.loading || mutation.pending || mutation.blocked;
  function saved(record: NurseryDetail) { detail.replace(record); setEditing(false); setClosing(false); onChanged(record); }
  async function leaveEditor(action: () => void) {
    if (editing && !(await editGuard.current?.canLeave())) return;
    setEditing(false); action();
  }
  async function cancel() {
    if (!batch || !edit || mutation.busy() || busy) return;
    const reason = await confirmation.prompt(`Xóa đợt ươm ${batch.code}? Vùng ${batch.zoneCode} · ${batch.zoneName}: ${quantityText(batch.quantityIn)} sẽ được hoàn lại lô giống ${batch.seedLot.code} trong kho. Đợt chuyển sang "Đã hủy" và vẫn lưu trong lịch sử. Nhập lý do xóa bên dưới.`);
    if (!reason) return;
    const result = await mutation.run(() => nurseryService.save("cancel", batch.zoneId, { reason, rowVersion: batch.rowVersion }, batch.id));
    if (result) saved(result);
  }
  return <section className={styles.detail} aria-label="Chi tiết đợt ươm giống">{confirmation.dialog}
    {detail.loading && !batch && <Skeleton />}
    <ErrorNotice error={nurseryDisplayText(detail.error || mutation.error)} />
    {(detail.error || mutation.blocked) && <Button key="reload-nursery-detail" type="button" variant="secondary" className="w-auto" disabled={detail.loading || mutation.pending} onClick={() => void leaveEditor(() => { detail.reload(); setReviewRequested(true); })}>Tải lại đợt ươm để đối chiếu</Button>}
    {mutation.blocked && reviewRequested && !detail.loading && !detail.error && <Button key="reviewed-nursery-detail" type="button" variant="secondary" className="w-auto" onClick={() => { mutation.reviewed(); setReviewRequested(false); }}>Đã đối chiếu, tiếp tục</Button>}
    {batch && <>
      <header className={styles.header}><div><h3>Đợt ươm {batch.code}</h3><p className="mt-1 text-xs text-text-muted">Vùng ươm: {batch.zoneCode} · {batch.zoneName}</p></div><StatusPill tone={nurseryStatusTone(batch.statusId)}>{nurseryStatus(batch.statusId)}</StatusPill></header>
      <Subtabs<Tab> label="Hồ sơ đợt ươm" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void leaveEditor(() => setTab(key)); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>
        {tab === "info" && (editing && edit ? <NurseryEditForm key={batch.rowVersion} batch={batch} leaveRef={editGuard} guard={guard} onClose={() => setEditing(false)} onSaved={saved} onReload={() => { setEditing(false); detail.reload(); }} /> : <>
          <Facts items={[["Mã đợt ươm", batch.code],
            ["Lô giống", batch.seedLot.receiptCode ? <Link className="underline" href={farmingReferenceHref("purchaseReceipt", { code: batch.seedLot.receiptCode })}>{batch.seedLot.code}</Link> : batch.seedLot.code],
            ["Tên giống", batch.seedLot.itemName], ["Nhà cung cấp", batch.seedLot.supplierName],
            ["Ngày bắt đầu", formatVietnameseDate(batch.startDate)], ["Số ngày ươm", `${batch.daysNursing} ngày`],
            ["Tồn kho hiện tại của lô", quantityText(batch.seedLotOnHand, batch.seedLot.unit)], ["Người ghi nhận", batch.recordedByName],
            ["Phiếu xuất dùng", batch.issueCode ? <Link className="underline" href={issueLink(batch.issueCode)!}>{batch.issueCode}</Link> : "—"],
            ...(batch.completedOn ? [["Ngày hoàn tất", formatVietnameseDate(batch.completedOn)]] as const : []),
            ...(batch.closedOn ? [["Ngày đóng đợt ươm", formatVietnameseDate(batch.closedOn)]] as const : []),
            ["Ghi chú", nurseryDisplayText(batch.note)], ...(batch.cancelReason ? [["Lý do hủy", nurseryDisplayText(batch.cancelReason)]] as const : [])]} />
          <NurseryInventoryFacts batch={batch} />
          <NurseryUsage batch={batch} />
          <TabFooter left={edit && <Button key="cancel-nursery" type="button" variant="secondary" className="w-auto border-danger text-danger" disabled={busy} onClick={() => void cancel()}>Xóa đợt ươm</Button>}
            right={<>{edit && <Button key="edit-nursery" type="button" variant="secondary" className="w-auto" disabled={busy} onClick={() => setEditing(true)}>Chỉnh sửa</Button>}
              {correct && <Button key="correct-nursery" type="button" variant="secondary" className="w-auto" disabled={busy} onClick={() => onCorrect(batch)}>Sửa số sống sót (ước tính)</Button>}
              {close && <Button key="close-nursery" type="button" variant="secondary" className="w-auto" disabled={busy} onClick={() => setClosing(true)}>Đóng đợt ươm</Button>}
              {complete && <Button key="complete-nursery" type="button" className="w-auto" disabled={busy} onClick={() => onComplete(batch)}>Hoàn tất ươm</Button>}</>} />
        </>)}
        {tab === "photos" && <NurseryPhotoGallery batch={batch} />}
        {tab === "history" && <NurseryHistoryTab key={batch.rowVersion} id={batch.id} zoneId={batch.zoneId} />}
      </div>
      {closing && <NurseryCloseDialog key={`${batch.id}-${batch.rowVersion}`} batch={batch} guard={guard} onClose={() => setClosing(false)} onSaved={saved} />}
    </>}
  </section>;
}

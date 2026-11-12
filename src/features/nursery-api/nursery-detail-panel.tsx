"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { cycleJourneyLink, issueLink } from "@/features/farming-management/entity-links";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Skeleton } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { nurseryStatus, quantityText, type NurseryDetail } from "./contracts";
import { NurseryEditForm, type NurseryEditGuard } from "./nursery-edit-form";
import { NurseryHistoryTab } from "./nursery-history-tab";
import { nurseryService } from "./service";
import { useNurseryMutation } from "./use-nursery-mutation";

type Tab = "info" | "photos" | "allocations" | "history";
const tabs: { key: Tab; label: string }[] = [{ key: "info", label: "Thông tin" }, { key: "photos", label: "Ảnh hiện trường" }, { key: "allocations", label: "Phân bổ và chu kỳ" }, { key: "history", label: "Lịch sử" }];
export function NurseryDetailPanel({ id, zoneId, onChanged, onComplete, onCorrect, onTransfer, guard }: {
  id: string; zoneId: string; guard: UnsavedGuard; onChanged(batch: NurseryDetail): void; onComplete(batch: NurseryDetail): void;
  onCorrect(batch: NurseryDetail): void; onTransfer(batch: NurseryDetail): void;
}) {
  const detail = useStickyRemote(useCallback((signal: AbortSignal) => nurseryService.detail(id, zoneId, signal), [id, zoneId]));
  const [tab, setTab] = useState<Tab>("info"), [editing, setEditing] = useState(false), [reviewRequested, setReviewRequested] = useState(false);
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
  const correct = batch?.statusId === 4002 && batch.canCorrectSurvivors && can("Edit"), busy = detail.loading || mutation.pending || mutation.blocked;
  function saved(record: NurseryDetail) { detail.replace(record); setEditing(false); onChanged(record); }
  async function leaveEditor(action: () => void) {
    if (editing && !(await editGuard.current?.canLeave())) return;
    setEditing(false); action();
  }
  async function cancel() {
    if (!batch || !edit || mutation.busy() || busy) return;
    const reason = await confirmation.prompt(`Hủy đợt ươm ${batch.code} và hoàn kho?`);
    if (!reason) return;
    const result = await mutation.run(() => nurseryService.save("cancel", batch.zoneId, { reason, rowVersion: batch.rowVersion }, batch.id));
    if (result) saved(result);
  }
  return <section className={styles.detail} aria-label="Chi tiết đợt ươm giống">{confirmation.dialog}
    {detail.loading && !batch && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {(detail.error || mutation.blocked) && <Button key="reload-nursery-detail" type="button" variant="secondary" className="w-auto" disabled={detail.loading || mutation.pending} onClick={() => void leaveEditor(() => { detail.reload(); setReviewRequested(true); })}>Tải lại đợt ươm để đối chiếu</Button>}
    {mutation.blocked && reviewRequested && !detail.loading && !detail.error && <Button key="reviewed-nursery-detail" type="button" variant="secondary" className="w-auto" onClick={() => { mutation.reviewed(); setReviewRequested(false); }}>Đã đối chiếu, tiếp tục</Button>}
    {batch && <>
      <header className={styles.header}><h3>Đợt ươm {batch.code}</h3><StatusPill tone={batch.statusId === 4002 ? "success" : "neutral"}>{nurseryStatus(batch.statusId)}</StatusPill></header>
      <Subtabs<Tab> label="Hồ sơ đợt ươm" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void leaveEditor(() => setTab(key)); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>
        {tab === "info" && (editing && edit ? <NurseryEditForm key={batch.rowVersion} batch={batch} leaveRef={editGuard} guard={guard} onClose={() => setEditing(false)} onSaved={saved} onReload={() => { setEditing(false); detail.reload(); }} /> : <>
          <Facts items={[["Mã đợt ươm", batch.code], ["Vùng nuôi", `${batch.zoneCode} · ${batch.zoneName}`],
            ["Lô giống", batch.seedLot.receiptCode ? <Link className="underline" href={farmingReferenceHref("purchaseReceipt", { code: batch.seedLot.receiptCode })}>{batch.seedLot.code}</Link> : batch.seedLot.code],
            ["Tên giống", batch.seedLot.itemName], ["Nhà cung cấp", batch.seedLot.supplierName], ["Số mảnh vào ươm", quantityText(batch.quantityIn)],
            ["Ngày bắt đầu", formatVietnameseDate(batch.startDate)], ["Số ngày ươm", `${batch.daysNursing} ngày`],
            ["Tồn kho hiện tại của lô", quantityText(batch.seedLotOnHand)], ["Người ghi nhận", batch.recordedByName],
            ["Phiếu xuất dùng", batch.issueCode ? <Link className="underline" href={issueLink(batch.issueCode)!}>{batch.issueCode}</Link> : "—"],
            ...(batch.statusId === 4002 ? [["Ngày hoàn tất", batch.completedOn ? formatVietnameseDate(batch.completedOn) : "—"], ["Số sống sót (ước tính)", quantityText(batch.survivors)],
              ["Hao hụt (ước tính)", quantityText(batch.lossPieces)], ["Tỷ lệ hao hụt (ước tính)", batch.lossPercent == null ? "—" : `${batch.lossPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`]] as const : []),
            ["Ghi chú", batch.note], ...(batch.cancelReason ? [["Lý do hủy", batch.cancelReason]] as const : [])]} />
          <TabFooter left={edit && <Button key="cancel-nursery" type="button" variant="ghost" className="w-auto text-danger" disabled={busy} onClick={() => void cancel()}>Hủy đợt ươm</Button>}
            right={<>{edit && <Button key="edit-nursery" type="button" variant="secondary" className="w-auto" disabled={busy} onClick={() => setEditing(true)}>Chỉnh sửa</Button>}
              {correct && <Button key="correct-nursery" type="button" variant="secondary" className="w-auto" disabled={busy} onClick={() => onCorrect(batch)}>Sửa số sống sót (ước tính)</Button>}
              {complete && <Button key="complete-nursery" type="button" className="w-auto" disabled={busy} onClick={() => onComplete(batch)}>Hoàn tất ươm</Button>}</>} />
        </>)}
        {tab === "photos" && <div className="space-y-4">{([["Ảnh bắt đầu ươm", batch.startPhotos], ["Ảnh hoàn tất ươm", batch.completionPhotos]] as const).map(([label, photos]) => <section key={label}><h4 className="mb-2 font-medium">{label}</h4>
          {!photos.length ? <p className="text-sm text-text-muted">Không có ảnh được ghi nhận.</p> : <div className="flex flex-wrap gap-3">{photos.map((photo, index) => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" aria-label={`${label} ${index + 1}, mở ảnh`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated BFF image */}
            <img src={photo.url} alt={`${label} ${index + 1}`} loading="lazy" className="h-32 w-40 rounded-control border border-border object-cover" />
          </a>)}</div>}</section>)}</div>}
        {tab === "allocations" && <>
          {!batch.allocations.length ? <p className="text-sm text-text-muted">Chưa có phân bổ cho bè nuôi.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Bè nuôi", "Phân bổ", "Đã thả", "Còn lại", "Sản lượng dự kiến", "Chu kỳ nuôi"].map(label => <th key={label} scope="col" className="whitespace-nowrap border-b border-border p-2">{label}</th>)}</tr></thead>
            <tbody>{batch.allocations.map(row => <tr key={row.id}><td className="p-2"><Link className="underline" href={farmingReferenceHref("raft", { zoneId: batch.zoneId, recordId: row.raftId })}>{row.raftCode}</Link></td>
              <td className="whitespace-nowrap p-2">{quantityText(row.quantity)}</td><td className="whitespace-nowrap p-2">{quantityText(row.seeded)}</td><td className="whitespace-nowrap p-2">{quantityText(row.remaining ?? row.quantity - row.seeded)}</td>
              <td className="whitespace-nowrap p-2">{quantityText(row.targetYieldKg, "kg")}</td><td className="p-2"><Link className="underline" href={cycleJourneyLink({ zoneId: batch.zoneId, raftId: row.raftId, cycleId: row.cycleId })!}>Xem hành trình{!row.canChange ? " · Đã chốt" : ""}</Link></td></tr>)}</tbody></table></div>}
          <TabFooter right={correct && <Button key="transfer-nursery" type="button" className="w-auto" disabled={busy} onClick={() => onTransfer(batch)}>Chuyển phân bổ giữa các bè</Button>} />
        </>}
        {tab === "history" && <NurseryHistoryTab key={batch.rowVersion} id={batch.id} zoneId={batch.zoneId} />}
      </div>
    </>}
  </section>;
}

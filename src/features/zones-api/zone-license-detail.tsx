"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { licenseSchema, licenseTypeLabel, stateLabel, type License } from "@/features/farming-api/contracts";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { StatusConfirmDialog } from "@/features/farming-management/status-confirm-dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";

const day = (value: string | null) => value ? formatVietnameseDate(value) : null;
/**
 * The opened license shown under its row; replacing or correcting it opens the existing license form.
 * `canDelete` (the Owner, on a zone in use) offers "Xóa" for a document that neither replaced another nor was replaced.
 */
export function ZoneLicenseDetail({ id, asOf, canEdit, canDelete = false, onOpen, onEdit, onReplace, onDeleted, editor }: {
  id: string; asOf: string; canEdit: boolean; canDelete?: boolean; editor?: ReactNode; onOpen(id: string): void; onEdit(record: License): void; onReplace(record: License): void; onDeleted?(): void;
}) {
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []);
  const [confirming, setConfirming] = useState(false), mutation = useMutation(), { notify } = useToast();
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("detail", { id, asOf }, licenseSchema, signal), [repository, id, asOf]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được giấy tờ."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const record = remote.data;
  if (editor) return <div className={styles.body}>{editor}</div>;
  const deletable = canDelete && !record.replacesDocumentId && !record.replacedByDocumentId;
  const label = `${licenseTypeLabel(record.documentType)}${record.documentNumber ? ` ${record.documentNumber}` : ""}`;
  async function remove() {
    if (mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.post("delete", { id, rowVersion: record.rowVersion }, z.object({ done: z.literal(true) })));
    setConfirming(false);
    if (!result) return;
    notify({ tone: "success", title: `Đã xóa giấy tờ ${label}.` });
    onDeleted?.();
  }
  // A document that replaced another, or was replaced, stays in the history: the backend refuses (409) and says so.
  const refused = mutation.failure?.status === "error" && mutation.failure.code === "MSG-GEN-09" ? "Giấy tờ đã thay thế hoặc đã được thay thế bằng giấy tờ khác nên không xóa được." : mutation.error;
  return <div className={styles.body}>
    <ErrorNotice error={refused} />
    <Facts items={[["Loại giấy tờ", licenseTypeLabel(record.documentType)], ["Số giấy tờ", record.documentNumber], [`Tình trạng tại ${day(record.asOf)}`, stateLabel(record.state)],
      ["Hiệu lực từ", day(record.effectiveDate)], ["Hết hạn", day(record.expiryDate)], ["Cơ quan cấp", record.issuingAuthority], ["Chủ thể được cấp", record.holder],
      ["Vùng được bao phủ", record.zones.map(zone => <Link key={zone.id} className={`${styles.link} mr-2`} href={farmingReferenceHref("zone", { recordId: zone.id, search: zone.code })}>{zone.code} · {zone.name}</Link>)], ["Phạm vi pháp lý", record.legalScope],
      ["Tệp giấy tờ", record.fileUrl ? <a className={styles.link} href={record.fileUrl} download>Tải tệp giấy tờ</a> : null]]} />
    <TabFooter
      left={<>{deletable && <Button key="delete" type="button" variant="ghost" className="w-auto" disabled={mutation.pending} onClick={() => { mutation.reviewed(); setConfirming(true); }}><InterfaceIcon name="trash" className="size-4" />Xóa</Button>}
        {mutation.blocked && <Button key="reload" type="button" variant="ghost" className="w-auto" onClick={() => { remote.reload(); mutation.reviewed(); }}>Tải lại giấy tờ</Button>}
        {record.replacesDocumentId && <Button key="previous" type="button" variant="ghost" className="w-auto" onClick={() => onOpen(record.replacesDocumentId!)}>Xem giấy tờ trước</Button>}
        {record.replacedByDocumentId && <Button key="next" type="button" variant="ghost" className="w-auto" onClick={() => onOpen(record.replacedByDocumentId!)}>Xem giấy tờ thay thế</Button>}</>}
      right={canEdit && !record.replacedByDocumentId ? <><Button key="replace" type="button" variant="secondary" className="w-auto" onClick={() => onReplace(record)}>Gia hạn / thay thế</Button>
        <Button key="edit" type="button" className="w-auto" onClick={() => onEdit(record)}>Sửa giấy tờ</Button></> : undefined} />
    {confirming && <StatusConfirmDialog title="Xóa giấy tờ?" subject={label} description="Giấy tờ bị xóa khỏi hồ sơ vùng và không khôi phục được. Chỉ xóa được giấy tờ chưa thay thế và chưa được thay thế."
      confirmLabel="Xác nhận xóa" pending={mutation.pending} busy={mutation.busy} onCancel={() => setConfirming(false)} onConfirm={() => void remove()} />}
  </div>;
}

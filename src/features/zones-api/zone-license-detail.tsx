"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { licenseSchema, licenseTypeLabel, stateLabel, type License } from "@/features/farming-api/contracts";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { createOperationsRepository } from "@/features/operations/repository";
import { Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";

const day = (value: string | null) => value ? formatVietnameseDate(value) : null;
/** The opened license shown under its row; replacing or correcting it opens the existing license form. */
export function ZoneLicenseDetail({ id, asOf, canEdit, onOpen, onEdit, onReplace, editor }: {
  id: string; asOf: string; canEdit: boolean; editor?: ReactNode; onOpen(id: string): void; onEdit(record: License): void; onReplace(record: License): void;
}) {
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []);
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("detail", { id, asOf }, licenseSchema, signal), [repository, id, asOf]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được giấy tờ."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const record = remote.data;
  if (editor) return <div className={styles.body}>{editor}</div>;
  return <div className={styles.body}>
    <Facts items={[["Loại giấy tờ", licenseTypeLabel(record.documentType)], ["Số giấy tờ", record.documentNumber], [`Tình trạng tại ${day(record.asOf)}`, stateLabel(record.state)],
      ["Hiệu lực từ", day(record.effectiveDate)], ["Hết hạn", day(record.expiryDate)], ["Cơ quan cấp", record.issuingAuthority], ["Chủ thể được cấp", record.holder],
      ["Vùng được bao phủ", record.zones.map(zone => <Link key={zone.id} className={`${styles.link} mr-2`} href={farmingReferenceHref("zone", { recordId: zone.id, search: zone.code })}>{zone.code} · {zone.name}</Link>)], ["Phạm vi pháp lý", record.legalScope],
      ["Tệp giấy tờ", record.fileUrl ? <a className={styles.link} href={record.fileUrl} download>Tải tệp giấy tờ</a> : null]]} />
    <TabFooter
      left={<>{record.replacesDocumentId && <Button key="previous" type="button" variant="ghost" className="w-auto" onClick={() => onOpen(record.replacesDocumentId!)}>Xem giấy tờ trước</Button>}
        {record.replacedByDocumentId && <Button key="next" type="button" variant="ghost" className="w-auto" onClick={() => onOpen(record.replacedByDocumentId!)}>Xem giấy tờ thay thế</Button>}</>}
      right={canEdit && !record.replacedByDocumentId ? <><Button key="replace" type="button" variant="secondary" className="w-auto" onClick={() => onReplace(record)}>Gia hạn / thay thế</Button>
        <Button key="edit" type="button" className="w-auto" onClick={() => onEdit(record)}>Sửa giấy tờ</Button></> : undefined} />
  </div>;
}

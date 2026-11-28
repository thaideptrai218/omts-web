"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { materialList, type materialRecord } from "@/features/cultivation-api/records-contracts";
import { MaterialForm } from "@/features/cultivation-api/records-material-form";
import { materialRepo, useAllowed } from "@/features/cultivation-api/records-shared";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { EditedRecordHistory } from "@/features/history/record-history";
import { Skeleton, money, useRemote } from "@/features/operations/ui";
import { getRaftCosts } from "@/features/purchase-documents/repository";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { RaftAccess } from "./raft-detail-panel";
import { fmtDateTime } from "./raft-format";
import type { RaftDetail } from "./raft-model";
import { useOpenCycle } from "./use-open-cycle";

type Usage = z.infer<typeof materialRecord>;
/** One material-use document: the lines recorded together under one issue (Xuất dùng) code, or on one day for one repair when no code came back. */
type UsageDocument = { key: string; code: string | null; issueId?: string | null; usageDate: string; repairReason: string; recordedAt: string; recordedByName: string | null; lines: Usage[] };

const quantity = (lines: readonly Usage[]) => new Set(lines.map(line => line.unit)).size === 1
  ? `${lines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${lines[0].unit}` : `${lines.length} dòng`;
const firstItem = (lines: readonly Usage[]) => `${lines[0].itemName}${lines.length > 1 ? ` +${lines.length - 1}` : ""}`;

/** Groups the usage records of a raft into documents, newest first. */
function documentsOf(list: z.infer<typeof materialList>): UsageDocument[] {
  const byKey = new Map<string, UsageDocument>();
  for (const group of list.groups) for (const repair of group.repairs) for (const record of repair.records) {
    const key = record.issueCode ?? `${repair.usageDate}|${repair.repairReason}|${record.cycleId ?? ""}`, found = byKey.get(key);
    if (found) found.lines.push(record);
    else byKey.set(key, { key, code: record.issueCode ?? null, issueId: record.issueId, usageDate: repair.usageDate, repairReason: repair.repairReason, recordedAt: record.recordedAt, recordedByName: record.recordedByName, lines: [record] });
  }
  return [...byKey.values()].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/**
 * "Vật tư": the material-use documents of the raft as a table (Xuất dùng code as the link, time, items, quantity, cost, recorder; paged here because the backend returns the whole list).
 * The link opens the document as a card with its lines. "+ Dùng vật tư" opens the material-use form of the Sử dụng vật tư screen with this zone, raft and open cycle already set.
 */
export function RaftMaterialsTab({ raft, zoneId, access }: { raft: RaftDetail; zoneId: string; access: RaftAccess }) {
  const open = useOpenCycle(raft), allowed = useAllowed("material-usages", zoneId);
  const [using, setUsing] = useState(false), [viewing, setViewing] = useState<string>(), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const list = useRemote(useCallback((signal: AbortSignal) => materialRepo.read("list", { id: raft.id, zoneId }, materialList, signal), [raft.id, zoneId]));
  // Costs are priced at the latest purchase price and only for those who may read purchases; without them the column shows a dash.
  const costs = useRemote(useCallback((signal: AbortSignal) => access.costs ? getRaftCosts(raft.id, signal) : Promise.resolve({ status: "error" as const, httpStatus: 403, uncertain: false }), [raft.id, access.costs]));
  const amounts = useMemo(() => new Map((costs.data?.rafts.find(entry => entry.raft.id === raft.id)?.usages ?? []).map(usage => [usage.usageId, usage.unpriced ? null : usage.amount])), [costs.data, raft.id]);
  const docs = useMemo(() => list.data ? documentsOf(list.data) : [], [list.data]);
  const amountOf = (lines: readonly Usage[]) => !costs.data || lines.every(line => amounts.get(line.id) == null) ? "—" : money(lines.reduce((sum, line) => sum + (amounts.get(line.id) ?? 0), 0));
  const canUse = !!access.materialCreate;
  const reload = () => { list.reload(); costs.reload(); };
  const current = Math.min(page, Math.max(1, Math.ceil(docs.length / pageSize))), shown = docs.slice((current - 1) * pageSize, current * pageSize), viewed = docs.find(doc => doc.key === viewing);
  return <>
    {list.loading ? <Skeleton /> : list.error || !list.data ? <ListStateMessage error={list.error ?? "Không tải được sử dụng vật tư."} onRetry={list.reload} retryLabel="Tải lại" />
      : !docs.length ? <p className={styles.hint}>Bè chưa có lần sử dụng vật tư nào.</p>
        : <><div className="overflow-x-auto"><table className={styles.subTable}><thead><tr><th scope="col">Chứng từ</th><th scope="col">Thời gian</th><th scope="col">Vật tư</th><th scope="col">Số lượng</th><th scope="col">Thành tiền</th><th scope="col">Người lập</th></tr></thead>
          <tbody>{shown.map(doc => <tr key={doc.key}>
            <td><button type="button" className={styles.link} aria-label={`Xem phiếu ${doc.code ?? formatVietnameseDate(doc.usageDate)}`} onClick={() => setViewing(doc.key)}>{doc.code ?? `Ngày ${formatVietnameseDate(doc.usageDate)}`}</button></td>
            <td className="whitespace-nowrap">{fmtDateTime(doc.recordedAt)}</td><td>{firstItem(doc.lines)}</td><td className="whitespace-nowrap">{quantity(doc.lines)}</td>
            <td className="whitespace-nowrap">{amountOf(doc.lines)}</td><td>{doc.recordedByName ?? "—"}</td></tr>)}</tbody></table></div>
          <ManagementPagination page={current} pageSize={pageSize} total={docs.length} unit="phiếu" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} /></>}
    <TabFooter right={canUse ? <Button key="use-material" type="button" className="w-auto" onClick={() => setUsing(true)}><InterfaceIcon name="add" className="size-4" />Dùng vật tư</Button> : undefined} />
    {using && <MaterialForm zoneId={zoneId} raftId={raft.id} cycleId={open.cycle?.id} record={null} allowed={action => action === "Create" && canUse}
      onClose={() => setUsing(false)} onSaved={() => { setUsing(false); reload(); }} />}
    {viewed && <UsageCard doc={viewed} zoneId={zoneId} raftId={raft.id} cycleId={open.cycle?.id} amountOf={line => amounts.has(line.id) ? amounts.get(line.id) == null ? "chưa có giá nhập" : money(amounts.get(line.id)) : "—"} allowed={allowed} onClose={() => setViewing(undefined)} onChanged={reload} />}
  </>;
}

/** A material-use document as a card: its facts and lines; a line can be corrected or removed with the existing form while the backend allows it. */
function UsageCard({ doc, zoneId, raftId, cycleId, amountOf, allowed, onClose, onChanged }: { doc: UsageDocument; zoneId: string; raftId: string; cycleId?: string; amountOf(line: Usage): string; allowed(action: string): boolean; onClose(): void; onChanged(): void }) {
  const [editing, setEditing] = useState<Usage>();
  return <Dialog open size="lg" title={doc.code ? `Sử dụng vật tư ${doc.code}` : `Sử dụng vật tư ngày ${formatVietnameseDate(doc.usageDate)}`} onOpenChange={open => { if (!open && !editing) onClose(); }}>
    <Facts items={[["Phiếu xuất dùng", doc.code ? <Link key="issue" className={styles.link} href={farmingReferenceHref("inputUse", { code: doc.code })}>{doc.code}</Link> : null], ["Ngày sử dụng", formatVietnameseDate(doc.usageDate)],
      ["Ghi lúc", fmtDateTime(doc.recordedAt)], ["Người lập", doc.recordedByName], ["Nội dung sửa chữa / bảo dưỡng", doc.repairReason]]} />
    <table className={`${styles.subTable} mt-3`}><thead><tr><th scope="col">Vật tư</th><th scope="col">Số lượng</th><th scope="col">Thành tiền</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
      <tbody>{doc.lines.map(line => <tr key={line.id}>
        <td><Link className={styles.link} href={farmingReferenceHref("inputItem", { code: line.itemCode })}>{line.itemCode}</Link> · {line.itemName}</td>
        <td className="whitespace-nowrap">{line.quantity.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} {line.unit}</td><td className="whitespace-nowrap">{amountOf(line)}</td>
        <td>{line.canEdit && allowed("Edit") && <Button type="button" variant="ghost" className="w-auto" aria-label={`Sửa ${line.itemCode}`} onClick={() => setEditing(line)}><InterfaceIcon name="pencil" className="size-4" />Sửa</Button>}</td></tr>)}</tbody></table>
    {doc.lines.map(line => <EditedRecordHistory key={line.id} kind="material-usages" id={line.id} zoneId={zoneId} />)}
    {editing && <MaterialForm zoneId={zoneId} raftId={raftId} cycleId={cycleId} record={editing} allowed={allowed} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); onClose(); onChanged(); }} />}
  </Dialog>;
}

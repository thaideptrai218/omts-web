"use client";
import { useSearchParams } from "next/navigation";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { Fragment, useMemo, useState } from "react";
import type { z } from "zod";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { Button } from "@/components/ui/button";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataTable, ErrorNotice, Paging, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { CompleteSeeding } from "./records-complete-seeding-dialog";
import { SeedingForm } from "./records-seeding-form";
import { SeedingRecordDetails } from "./seeding-record-details";
import { SeedingSummaryStrip } from "./seeding-summary-strip";
import { seedRepo, useAllowed } from "./records-shared";

const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/** Running total after each record, oldest first (the list itself is shown newest first). */
function runningTotals(records: readonly z.infer<typeof c.seedingRecord>[]) {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const record of [...records].sort((a, b) => a.seedingDate.localeCompare(b.seedingDate) || a.recordedAt.localeCompare(b.recordedAt))) totals.set(record.id, sum += record.quantity);
  return totals;
}

/** Seeding records of the raft's current cycle, per day, and the "mark seeding complete" action. */
export function SeedingPanel({ zoneId, raftId, cycleId, cycleStartDate }: { zoneId: string; raftId: string; cycleId: string; cycleStartDate?: string }) {
  const query = useSearchParams();
  const [expanded, setExpanded] = useState<string | undefined>(() => query.get("recordId") ?? undefined);
  const allowed = useAllowed("seeding", zoneId);
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => seedRepo.read("list", { id: cycleId, zoneId }, c.seedingList, signal), [cycleId, zoneId]));
  const [selected, setSelected] = useState<z.infer<typeof c.seedingRecord> | null>();
  const [completing, setCompleting] = useState(false);
  const data = remote.data;
  const [page, setPage] = useState<number>();
  const linkedPage = Math.max(1, Math.ceil(((data?.records.findIndex(v => v.id === query.get("recordId")) ?? 0) + 1) / 10));
  const currentPage = Math.min(page ?? linkedPage, Math.max(1, Math.ceil((data?.records.length ?? 0) / 10)));
  const visible = data?.records.slice((currentPage - 1) * 10, currentPage * 10) ?? [];
  const totals = useMemo(() => runningTotals(data?.records ?? []), [data?.records]);
  const fromNursery = !!data?.nurseryBatchId, completed = !!data?.seedingCompletedOn;
  const reload = () => { setSelected(undefined); remote.reload(); };
  const form = (record: z.infer<typeof c.seedingRecord> | null) => data && <SeedingForm zoneId={zoneId} raftId={raftId} cycleId={cycleId} cycleStartDate={cycleStartDate} data={data} record={record} allowed={allowed} onClose={() => setSelected(undefined)} onSaved={reload} />;
  const toggle = (id: string) => setExpanded(current => current === id ? undefined : id);
  return (
    <section className={flowStyles.recordsPanel}>
      <ErrorNotice error={remote.error} />
      <div className={flowStyles.panelHeading}>
        <div>
          <h3>Các lần thả giống</h3>
          <p>{data ? `${data.records.length} lần ghi nhận · ${data.seededCount}/${data.laneCount} làn đã thả giống` : "Theo dõi giống trong chu kỳ đang chọn"}</p>
        </div>
        <div className={flowStyles.actions}>
          {data?.canRecord && !completed && allowed("Create") && <Button type="button" disabled={remote.loading} onClick={() => setSelected(null)}>Ghi nhận thả giống</Button>}
          <Button type="button" variant="secondary" disabled={remote.loading} onClick={remote.reload}>Tải lại</Button>
        </div>
      </div>
      {remote.loading ? <Skeleton /> : data && <>
        <SeedingSummaryStrip data={data} />
        {!completed && <div className={flowStyles.completion}>
          {/* The completion state itself is in the summary strip above. */}
          <span>{data.records.length ? "" : "Chưa thả giống. Ghi nhận thả giống trước, sau đó mới đánh dấu hoàn tất."}</span>
          {/* Offered once at least one record exists; completion does not need every lane at 100%. */}
          {!completed && data.canMarkComplete && data.records.length > 0 && allowed("Create") && <Button type="button" variant="secondary" onClick={() => setCompleting(true)}>Đánh dấu hoàn tất thả giống</Button>}
        </div>}
        <DataTable responsive headings={fromNursery ? ["Ngày thả", "Số mảnh (ước tính)", "Làn", "Người ghi nhận", "Tổng đã thả"] : ["Ngày thả", "Lô giống / nhà cung cấp", "Làn", "Số lượng", "Người ghi nhận"]} empty={!data.records.length}>
          {visible.map(v => <Fragment key={v.id}>
            <OpenableTableRow data-selected={expanded === v.id || undefined} onOpen={() => toggle(v.id)}>
              <td data-label="Ngày thả">
                <button type="button" className={flowStyles.recordLink} aria-label={`Chi tiết thả giống ngày ${formatVietnameseDate(v.seedingDate)}`} aria-expanded={expanded === v.id} onClick={() => toggle(v.id)}>{formatVietnameseDate(v.seedingDate)}</button>
              </td>
              {fromNursery ? <>
                <td data-label="Số mảnh (ước tính)" className="whitespace-nowrap text-right tabular-nums">{n(v.quantity)}</td>
                <td data-label="Làn">{compressLaneNumbers(v.laneNumbers)}</td>
                <td data-label="Người ghi nhận">{v.recordedByName ?? "—"}</td>
                <td data-label="Tổng đã thả" className="whitespace-nowrap text-right tabular-nums">{n(totals.get(v.id) ?? v.quantity)}</td>
              </> : <>
                <td data-label="Lô giống / nhà cung cấp">
                  <Link href={farmingReferenceHref("seeding", { zoneId, raftId, cycleId, recordId: v.id })}>{v.seedLot.code}</Link>
                  <span className="block text-xs text-text-muted">{v.seedLot.supplierName}</span>
                </td>
                <td data-label="Làn">{compressLaneNumbers(v.laneNumbers)}</td>
                <td data-label="Số lượng" className="whitespace-nowrap text-right tabular-nums">{n(v.quantity)} {v.seedLot.unit}</td>
                <td data-label="Người ghi nhận">{v.recordedByName ?? "—"}</td>
              </>}
            </OpenableTableRow>
            {expanded === v.id && <tr><td colSpan={5} className={flowStyles.recordDetailCell}>
              {selected?.id === v.id && !completed ? form(v)
                : <SeedingRecordDetails record={v} zoneId={zoneId} nurseryCode={data.nurseryBatchId ? data.nurseryCode ?? null : undefined} completed={completed} canAct={allowed("Edit") || allowed("Delete")} canEdit={allowed("Edit")} onEdit={() => setSelected(v)} onClose={() => setExpanded(undefined)} />}
            </td></tr>}
          </Fragment>)}
        </DataTable>
        <div className={flowStyles.tablePaging}><Paging page={currentPage} total={data.records.length} pageSize={10} onChange={setPage} /></div>
        {fromNursery && !!data.records.length && <p className="mt-2 text-sm font-medium">Tổng cộng đã thả: {n(data.nurserySeeded ?? data.records.reduce((sum, v) => sum + v.quantity, 0))} mảnh (ước tính)</p>}
        {!fromNursery && <details className={flowStyles.lotSummary}>
          <summary>Tổng giống theo lô · {data.lots.length} lô</summary>
          <DataTable headings={["Lô giống", "Số lượng đã thả"]} empty={!data.lots.length}>
            {data.lots.map(v => <tr key={v.seedLotId}><td>{v.code}</td><td className="text-right tabular-nums">{n(v.quantity)} {v.unit}</td></tr>)}
          </DataTable>
        </details>}
        {selected === null && !completed && form(null)}
        {completing && !completed && <CompleteSeeding cycleId={cycleId} zoneId={zoneId} hasRecords={data.records.length > 0} onClose={() => setCompleting(false)} onSaved={() => { setCompleting(false); remote.reload(); }} />}
      </>}
    </section>
  );
}

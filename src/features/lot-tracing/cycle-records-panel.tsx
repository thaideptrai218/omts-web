"use client";
import { Fragment, useCallback, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { correctionRecords, type LogItem, type LotItem, type SeedingItem } from "./correction-contracts";
import { LogCorrectionDialog } from "./log-correction-dialog";
import { LotCorrectionDialog } from "./lot-correction-dialog";
import { SeedingCorrectionDialog } from "./seeding-correction-dialog";
import { cycleStatusLabel, formatDay, formatNumber, lanesText, originLabel, originTone } from "./trace-format";
import s from "./lot-tracing.module.css";

const repo = createOperationsRepository("lot-tracing");
type Tab = "seeding" | "logs" | "lots";
type Editing = { kind: "seeding"; item: SeedingItem } | { kind: "log"; item: LogItem } | { kind: "lot"; item: LotItem };
const Edit = ({ label, onClick }: { label: string; onClick(): void }) => <Button type="button" className="w-auto" aria-label={label} onClick={onClick}>Sửa</Button>;
const Table = ({ heads, children }: { heads: string[]; children: ReactNode }) => (
  <div className={s.tableWrap}><table className={s.table}><thead><tr>{heads.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
);

/** Bản ghi của một chu kỳ chỉ sửa được ở màn này (BR-TRACE-04): phiên thả giống, nhật ký nuôi và lô thu hoạch. */
export function CycleRecordsPanel({ cycleId, raftId }: { cycleId: string; raftId: string }) {
  const records = useRemote(useCallback((signal: AbortSignal) => repo.read("records", { id: cycleId }, correctionRecords, signal), [cycleId]));
  const [tab, setTab] = useState<Tab>("seeding"), [editing, setEditing] = useState<Editing>(), [expanded, setExpanded] = useState<string>();
  const data = records.data;
  const { notify } = useToast();
  const saved = (published: string[]) => {
    setEditing(undefined); records.reload();
    notify({ tone: "success", title: "Đã lưu bản sửa.", description: published.length ? `Đã cập nhật nguồn gốc lô ${published.join(", ")}.` : undefined });
  };

  if (records.loading) return <Skeleton />;
  if (records.error || !data) return <div><ErrorNotice error={records.error} /><Button type="button" className="w-auto" variant="secondary" onClick={records.reload}>Tải lại</Button></div>;
  const counts: Record<Tab, number> = { seeding: data.seedingRecords.length, logs: data.cultivationLogs.length, lots: data.harvestLots.length };
  const tabs: [Tab, string][] = [["seeding", "Phiên thả giống"], ["logs", "Nhật ký nuôi"], ["lots", "Lô thu hoạch"]];
  const empty = <p className={s.empty}>Chu kỳ này chưa có bản ghi nào cần sửa tại đây.</p>;
  return (
    <section className={s.card} aria-label={`Bản ghi của chu kỳ ${formatDay(data.startDate)}`}>
      <div className={s.cardHead}>
        <h2>Chu kỳ {formatDay(data.startDate)} · bè {data.raftCode} <StatusPill tone={data.closeDate ? "neutral" : "success"}>{cycleStatusLabel(data.cycleStatus)}</StatusPill></h2>
        <span className={s.muted}>{formatDay(data.startDate)} – {formatDay(data.closeDate)}</span>
      </div>

      <div className={s.seg} role="group" aria-label="Loại bản ghi">
        {tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => { setTab(key); setExpanded(undefined); setEditing(undefined); }}>{label} ({counts[key]})</button>)}
      </div>
      {tab === "seeding" && (counts.seeding ? (
        <Table heads={["Ngày thả giống", "Lô giống", "Làn", "Số lượng", "Lô thu hoạch", ""]}>
          {data.seedingRecords.map((r) => (
            <Fragment key={r.id}><OpenableTableRow onOpen={() => { setExpanded(expanded === r.id ? undefined : r.id); setEditing(undefined); }}><td>{formatDay(r.seedingDate)}</td><td>{r.seedLot.itemName ?? "Lô giống"} · {r.seedLot.code}<div className={s.muted}>{r.seedLot.supplierName}</div></td>
              <td>{lanesText(r.laneNumbers)}</td><td className={s.num}>{formatNumber(r.quantity)}</td><td>{r.lotCodes.join(", ") || "—"}</td></OpenableTableRow>{expanded === r.id && <tr><td colSpan={6}><section aria-label="Phiên thả giống">{editing?.kind === "seeding" && editing.item.id === r.id ? <SeedingCorrectionDialog item={r} raftId={raftId} onClose={() => setEditing(undefined)} onSaved={saved} /> : <div className={s.dialogActions}><Edit label={`Sửa phiên thả giống ${formatDay(r.seedingDate)}`} onClick={() => setEditing({ kind: "seeding", item: r })} /></div>}</section></td></tr>}</Fragment>
          ))}
        </Table>
      ) : empty)}
      {tab === "logs" && (counts.logs ? (
        <Table heads={["Ngày", "Ghi chú", "Ảnh", "Người ghi", ""]}>
          {data.cultivationLogs.map((r) => (
            <Fragment key={r.id}><OpenableTableRow onOpen={() => { setExpanded(expanded === r.id ? undefined : r.id); setEditing(undefined); }}><td>{formatDay(r.visitDate)}</td><td>{r.notes || "—"}</td><td className={s.num}>{r.photos.length}</td><td>{r.recordedByName ?? "—"}</td></OpenableTableRow>{expanded === r.id && <tr><td colSpan={5}><section aria-label="Nhật ký nuôi">{editing?.kind === "log" && editing.item.id === r.id ? <LogCorrectionDialog item={r} onClose={() => setEditing(undefined)} onSaved={saved} /> : <div className={s.dialogActions}><Edit label={`Sửa nhật ký ${formatDay(r.visitDate)}`} onClick={() => setEditing({ kind: "log", item: r })} /></div>}</section></td></tr>}</Fragment>
          ))}
        </Table>
      ) : empty)}
      {tab === "lots" && (counts.lots ? (
        <Table heads={["Lô", "Làn thu hoạch", "Số lồng", "kg ước tính", "Nguồn gốc", ""]}>
          {data.harvestLots.map((r) => (
            <Fragment key={r.id}><OpenableTableRow onOpen={() => { setExpanded(expanded === r.id ? undefined : r.id); setEditing(undefined); }}><td><strong className={s.code}>{r.lotCode}</strong><div className={s.muted}>{formatDay(r.harvestDate)}</div></td><td>{lanesText(r.laneNumbers)}</td>
              <td className={s.num}>{r.cageCount}</td><td className={s.num}>{formatNumber(r.estimatedKg)}</td><td><StatusPill tone={originTone(r.originState)}>{originLabel(r.originState)}</StatusPill></td></OpenableTableRow>{expanded === r.id && <tr><td colSpan={6}><section aria-label="Lô thu hoạch">{editing?.kind === "lot" && editing.item.id === r.id ? <LotCorrectionDialog item={r} onClose={() => setEditing(undefined)} onSaved={saved} /> : <div className={s.dialogActions}><Edit label={`Sửa dữ liệu thu hoạch lô ${r.lotCode}`} onClick={() => setEditing({ kind: "lot", item: r })} /></div>}</section></td></tr>}</Fragment>
          ))}
        </Table>
      ) : empty)}
    </section>
  );
}

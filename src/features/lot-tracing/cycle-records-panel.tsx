"use client";
import { useCallback, useState, type ReactNode } from "react";
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
const Edit = ({ label, onClick }: { label: string; onClick(): void }) => <Button className="w-auto" variant="secondary" aria-label={label} onClick={onClick}>Sửa</Button>;
const Table = ({ heads, children }: { heads: string[]; children: ReactNode }) => (
  <div className={s.tableWrap}><table className={s.table}><thead><tr>{heads.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
);

/** Bản ghi của một chu kỳ chỉ sửa được ở màn này (BR-TRACE-04): phiên thả giống, nhật ký nuôi và lô thu hoạch. */
export function CycleRecordsPanel({ cycleId, raftId }: { cycleId: string; raftId: string }) {
  const records = useRemote(useCallback((signal: AbortSignal) => repo.read("records", { id: cycleId }, correctionRecords, signal), [cycleId]));
  const [tab, setTab] = useState<Tab>("seeding"), [editing, setEditing] = useState<Editing>(), [notice, setNotice] = useState<string>();
  const data = records.data;
  const saved = (published: string[]) => {
    setEditing(undefined); records.reload();
    setNotice(published.length ? `Đã lưu bản sửa. Trang nguồn gốc của lô ${published.join(", ")} đã hiển thị dữ liệu mới.` : "Đã lưu bản sửa.");
  };

  if (records.loading) return <Skeleton />;
  if (records.error || !data) return <div><ErrorNotice error={records.error} /><Button className="w-auto" variant="secondary" onClick={records.reload}>Tải lại</Button></div>;
  const counts: Record<Tab, number> = { seeding: data.seedingRecords.length, logs: data.cultivationLogs.length, lots: data.harvestLots.length };
  const tabs: [Tab, string][] = [["seeding", "Phiên thả giống"], ["logs", "Nhật ký nuôi"], ["lots", "Lô thu hoạch"]];
  const empty = <p className={s.empty}>Chu kỳ này chưa có bản ghi nào cần sửa tại đây.</p>;
  return (
    <section className={s.card} aria-label={`Bản ghi của chu kỳ ${formatDay(data.startDate)}`}>
      <div className={s.cardHead}>
        <h2>Chu kỳ {formatDay(data.startDate)} · bè {data.raftCode} <StatusPill tone={data.closeDate ? "neutral" : "success"}>{cycleStatusLabel(data.cycleStatus)}</StatusPill></h2>
        <span className={s.muted}>{formatDay(data.startDate)} – {formatDay(data.closeDate)}</span>
      </div>
      <p className={s.hint}>Chỉ sửa được những bản ghi mà màn hình Nuôi trồng không còn cho sửa. Mỗi lần sửa cần có lý do{data.needsOwnerApproval ? " và Chủ hợp tác xã đã đồng ý trực tiếp" : ""}.</p>
      {notice && <p role="status" className={s.success}>{notice}</p>}
      <div className={s.seg} role="group" aria-label="Loại bản ghi">
        {tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label} ({counts[key]})</button>)}
      </div>
      {tab === "seeding" && (counts.seeding ? (
        <Table heads={["Ngày thả giống", "Lô giống", "Luống", "Số lượng", "Lô thu hoạch", ""]}>
          {data.seedingRecords.map((r) => (
            <tr key={r.id}><td>{formatDay(r.seedingDate)}</td><td>{r.seedLot.itemName ?? "Lô giống"} · {r.seedLot.code}<div className={s.muted}>{r.seedLot.supplierName}</div></td>
              <td>{lanesText(r.laneNumbers)}</td><td className={s.num}>{formatNumber(r.quantity)} dây</td><td>{r.lotCodes.join(", ") || "—"}</td>
              <td className={s.right}><Edit label={`Sửa phiên thả giống ${formatDay(r.seedingDate)}`} onClick={() => setEditing({ kind: "seeding", item: r })} /></td></tr>
          ))}
        </Table>
      ) : empty)}
      {tab === "logs" && (counts.logs ? (
        <Table heads={["Ngày", "Ghi chú", "Ảnh", "Người ghi", ""]}>
          {data.cultivationLogs.map((r) => (
            <tr key={r.id}><td>{formatDay(r.visitDate)}</td><td>{r.notes || "—"}</td><td className={s.num}>{r.photos.length}</td><td>{r.recordedByName ?? "—"}</td>
              <td className={s.right}><Edit label={`Sửa nhật ký ${formatDay(r.visitDate)}`} onClick={() => setEditing({ kind: "log", item: r })} /></td></tr>
          ))}
        </Table>
      ) : empty)}
      {tab === "lots" && (counts.lots ? (
        <Table heads={["Lô", "Luống thu hoạch", "Số lồng", "kg ước tính", "Nguồn gốc", ""]}>
          {data.harvestLots.map((r) => (
            <tr key={r.id}><td><strong className={s.code}>{r.lotCode}</strong><div className={s.muted}>{formatDay(r.harvestDate)}</div></td><td>{lanesText(r.laneNumbers)}</td>
              <td className={s.num}>{r.cageCount}</td><td className={s.num}>{formatNumber(r.estimatedKg)}</td><td><StatusPill tone={originTone(r.originState)}>{originLabel(r.originState)}</StatusPill></td>
              <td className={s.right}><Edit label={`Sửa dữ liệu thu hoạch lô ${r.lotCode}`} onClick={() => setEditing({ kind: "lot", item: r })} /></td></tr>
          ))}
        </Table>
      ) : empty)}
      {editing?.kind === "seeding" && <SeedingCorrectionDialog item={editing.item} raftId={raftId} onClose={() => setEditing(undefined)} onSaved={saved} />}
      {editing?.kind === "log" && <LogCorrectionDialog item={editing.item} onClose={() => setEditing(undefined)} onSaved={saved} />}
      {editing?.kind === "lot" && <LotCorrectionDialog item={editing.item} onClose={() => setEditing(undefined)} onSaved={saved} />}
    </section>
  );
}

"use client";
import { useMemo, useState } from "react";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { Button } from "@/components/ui/button";
import { createOperationsRepository } from "@/features/operations/repository";
import { DataTable, ErrorNotice, Field, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { raftProgress, laneProgress } from "./records-contracts";
import { CultivationLogs } from "./logs";
import { LaneBoard } from "./lane-board";
const repo = createOperationsRepository("cultivation-cycles");

export function RaftProgress({ raftId, zoneId, showLogs = true }: { raftId: string; zoneId: string; showLogs?: boolean }) {
  const [date, setDate] = useState(businessToday()), [lane, setLane] = useState<number>();
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repo.read("progress", { id: raftId, zoneId, ...(date ? { date } : {}) }, raftProgress, signal), [raftId, zoneId, date]));
  return <section className="mt-3 border-t border-border pt-3"><h3 className="mb-3 font-semibold">Tiến trình làn theo ngày</h3><div className="max-w-64"><Field label="Ngày xem" type="date" max={businessToday()} value={date} onChange={e => { setDate(e.target.value); setLane(undefined); }} /></div><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : <><p className="my-3 text-sm">{remote.data?.cycle ? `Chu kỳ từ ${formatVietnameseDate(remote.data.cycle.startDate)}` : "Không có chu kỳ tại ngày đã chọn"}</p><div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]"><LaneBoard lanes={remote.data?.lanes ?? []} selected={lane} onSelect={setLane} /><aside className="min-w-0 rounded-card border border-border bg-surface-subtle p-4">{lane ? <LaneDetail key={`${raftId}:${lane}:${remote.data?.cycle?.id ?? "none"}`} raftId={raftId} zoneId={zoneId} lane={lane} cycleId={remote.data?.cycle?.id} onClose={() => setLane(undefined)} /> : <p className="text-sm leading-6 text-text-muted">Chọn một làn để xem các lần thả giống và lô giống của làn ngay tại đây.</p>}</aside></div>{showLogs && remote.data?.cycle && <CultivationLogs cycleId={remote.data.cycle.id} zoneId={zoneId} />}</>}{remote.error && <Button variant="secondary" onClick={remote.reload}>Tải lại tiến trình</Button>}</section>;
}
export function LaneDetail({ raftId, zoneId, lane, cycleId, onClose }: { raftId: string; zoneId: string; lane: number; cycleId?: string; onClose(): void }) {
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => cycleId ? repo.read("lane-progress", { id: raftId, zoneId, laneNumber: String(lane), cycleId }, laneProgress, signal) : Promise.resolve({ status: "success" as const, data: null }), [raftId, zoneId, lane, cycleId]));
  if (!cycleId) return <p className="my-3 text-sm">Làn {lane}: không có chu kỳ tại ngày đã chọn.</p>;
  return <section className="min-w-0"><h4 className="font-medium">Các lần thả giống của làn {lane} trong chu kỳ</h4><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : <DataTable headings={["Ngày", "Lô giống", "Nhà cung cấp", "Số lượng cả lần thả"]} empty={!remote.data?.sessions.length}>{remote.data?.sessions.map(v => <tr key={v.id}><td className="whitespace-nowrap">{formatVietnameseDate(v.seedingDate)}</td><td className="whitespace-nowrap">{v.seedLot.code}</td><td>{v.seedLot.supplierName}</td><td>{v.quantity.toLocaleString("vi-VN")} {v.seedLot.unit}</td></tr>)}</DataTable>}<p className="my-3 text-xs text-text-muted">Số lượng thuộc cả lần thả giống, không được chia đều cho từng làn.</p><Button variant="secondary" onClick={onClose}>Thu gọn chi tiết làn</Button></section>;
}

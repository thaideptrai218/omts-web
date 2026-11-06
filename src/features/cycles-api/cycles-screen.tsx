"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { LaneBoard, CyclePlanSummary } from "@/features/cultivation-api/lane-board";
import { LaneDetail } from "@/features/cultivation-api/progress";
import { Button } from "@/components/ui/button";

import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, Field, OperationHeading, Select, Skeleton, businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { readCycles } from "./repository";
import { zoneCycles, cycleHistory, cycleProgress } from "./contracts";
import { CycleEditor } from "./cycle-editor";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { CultivationLogsDialog } from "./log-screen";
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);

export function CyclesScreen() {
  const context = useApiWorkspace();
  const permitted = (action: string) => context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === action);
  const [starting, setStarting] = useState<{ id: string; code: string }>(), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [logsOpen, setLogsOpen] = useState(false), [selectedLane, setSelectedLane] = useState<number>();
  const zones = useRemote(loadZones), mutation = useMutation();
  const [zoneId, setZoneId] = useState(""), [raft, setRaft] = useState<{ id: string; code: string }>(), [date, setDate] = useState(businessToday()), [cycleId, setCycleId] = useState("");
  const [progress, setProgress] = useState<z.infer<typeof cycleProgress>>();
  const list = useRemote(useCallback((signal: AbortSignal) => zoneId ? readCycles({ action: "zone", zoneId }, zoneCycles, signal) : Promise.resolve({ status: "success" as const, data: [] }), [zoneId]));
  const history = useRemote(useCallback((signal: AbortSignal) => raft ? readCycles({ action: "history", raftId: raft.id }, cycleHistory, signal) : Promise.resolve({ status: "success" as const, data: [] }), [raft]));
  const activeRaft = useRef<string | undefined>(undefined), progressRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => progressRequest.current?.abort(), []);
  function back() { activeRaft.current=undefined; progressRequest.current?.abort(); setRaft(undefined); setProgress(undefined); setSelectedLane(undefined); }
  async function showProgress(id: string, selectedCycle = "", selectedDate = businessToday()) {
    progressRequest.current?.abort(); const request = new AbortController(); progressRequest.current=request;
    const next = await mutation.run(() => readCycles({ action: "progress", raftId: id, ...(selectedCycle ? { cycleId: selectedCycle } : { date: selectedDate }) }, cycleProgress, request.signal), true);
    if (next && !request.signal.aborted && activeRaft.current === id) setProgress(next);
  }
  return <section><OperationHeading title="Chu kỳ nuôi" description="Chọn bè để xem tiến độ từng làn, kế hoạch và lịch sử ngay bên cạnh." icon="raft" />
    <FilterWorkspace label="Vùng và bè nuôi" filters={<><Select label="Vùng nuôi" value={zoneId} onChange={e => { back(); setZoneId(e.target.value); }}><option value="">Chọn vùng nuôi</option>{zones.data?.map(zone => <option key={zone.id} value={zone.id}>{String(zone.name)}</option>)}</Select><Button className="w-auto" variant="secondary" disabled={!zoneId || list.loading} onClick={list.reload}>Tải lại danh sách</Button><div className="space-y-2" role="group" aria-label="Chọn bè nuôi">{list.data?.map(row => <button type="button" key={row.raftId} aria-label={`Xem bè ${row.raftCode}`} aria-pressed={raft?.id === row.raftId} disabled={mutation.pending} className="w-full rounded-control border border-border bg-surface p-3 text-left aria-pressed:border-primary aria-pressed:bg-primary-soft disabled:opacity-60" onClick={() => { activeRaft.current=row.raftId; setRaft({ id: row.raftId, code: row.raftCode }); setDate(businessToday()); setCycleId(""); setSelectedLane(undefined); setProgress(undefined); void showProgress(row.raftId); }}><strong className="block text-sm">{row.raftCode}</strong><span className="mt-1 block text-xs text-text-muted">{row.laneCount} làn · {row.cycle ? row.cycle.closeDate ? "Đã kết thúc" : "Đang nuôi" : "Chưa có chu kỳ"}</span></button>)}</div></>}>
      <ErrorNotice error={zones.error || list.error} />{notice && <p role="status" className="my-3 text-sm">{notice}</p>}
      {list.loading ? <Skeleton /> : !zoneId ? <p className="py-8 text-sm text-text-muted">Chọn vùng để xem các bè và chu kỳ nuôi.</p> : !raft ? <p className="py-8 text-sm text-text-muted">Chọn bè trong danh sách để xem chu kỳ hiện tại. Với bè chưa có chu kỳ, bạn có thể bắt đầu một chu kỳ nuôi mới trong phần chi tiết.</p> : <section><Button className="mb-4 w-auto" variant="secondary" onClick={back}>← Quay lại danh sách bè</Button><OperationHeading title={`Lịch sử và tiến độ · ${raft.code}`} description="Tra cứu chu kỳ, tiến độ làn nuôi và nhật ký chăm sóc của bè." icon="raft" /><ErrorNotice error={history.error || mutation.error} />
      {progress?.cycle?.canEdit && permitted("Edit") && <Button className="mb-3 w-auto" variant="secondary" onClick={() => setEditing(true)}>Sửa kế hoạch chu kỳ</Button>}
      {progress?.cycle && (context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_LOGS" && p.action === "View")) && <Button className="mb-3 ml-2 w-auto" variant="secondary" onClick={() => setLogsOpen(true)}>Nhật ký chăm sóc</Button>}
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-52 flex-1"><Select label="Chu kỳ" value={cycleId} onChange={e => { setCycleId(e.target.value); setSelectedLane(undefined); }}><option value="">Theo ngày</option>{history.data?.map(cycle => <option key={cycle.id} value={cycle.id}>{cycle.startDate} → {cycle.closeDate ?? "Đang nuôi"}</option>)}</Select></div><Field label="Ngày xem" type="date" max={businessToday()} disabled={!!cycleId} value={date} onChange={e => { setDate(e.target.value); setSelectedLane(undefined); }} /><Button className="w-auto" disabled={mutation.pending || !cycleId && !date} onClick={() => void showProgress(raft.id, cycleId, date)}>Xem tiến độ</Button></div>
      {mutation.pending ? <Skeleton /> : progress && <><p className="my-4 text-sm">Ngày {progress.date} · {progress.cycle ? `${progress.cycle.daysOfFarming} ngày nuôi` : "Chưa có chu kỳ trong ngày này"}</p><div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"><LaneBoard lanes={progress.lanes} selected={selectedLane} onSelect={setSelectedLane} /><aside className="min-w-0 space-y-4">{progress.cycle && <CyclePlanSummary plan={progress.cycle} />}{selectedLane && <div className="rounded-card border border-border bg-surface-subtle p-4"><LaneDetail key={`${raft.id}:${progress.cycle?.id}:${selectedLane}`} raftId={raft.id} zoneId={zoneId} cycleId={progress.cycle?.id} lane={selectedLane} onClose={() => setSelectedLane(undefined)} /></div>}</aside></div></>}
{permitted("Create") && list.data?.find(row => row.raftId === raft.id)?.canStart && <Button className="my-4 w-auto" onClick={() => setStarting(raft)}>Bắt đầu chu kỳ nuôi cho bè {raft.code}</Button>}</section>}
    </FilterWorkspace>
    {logsOpen && progress?.cycle && <CultivationLogsDialog cycleId={progress.cycle.id} openCycle={progress.cycle.canEdit} onClose={() => setLogsOpen(false)} />}
    {(starting || editing && progress?.cycle) && <CycleEditor raftId={starting?.id ?? progress!.raftId} raftCode={starting?.code ?? progress!.raftCode} record={starting ? undefined : progress!.cycle!} canCancel={!!progress?.cycle?.canCancel && permitted("Delete")} onClose={() => { setStarting(undefined); setEditing(false); }} onSaved={() => { setStarting(undefined); setEditing(false); setRaft(undefined); setProgress(undefined); list.reload(); setNotice("Đã cập nhật chu kỳ nuôi."); }} />}
  </section>;
}

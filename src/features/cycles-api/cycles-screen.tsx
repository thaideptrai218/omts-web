"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { loadOptions } from "@/features/operations/lookups";
import { DataTable, ErrorNotice, Field, OperationHeading, Select, Skeleton, businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { readCycles } from "./repository";
import { zoneCycles, cycleHistory, cycleProgress } from "./contracts";
import { CycleEditor } from "./cycle-editor";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
const laneState = (state: string) => ({ NotSeeded: "Chưa thả giống", Growing: "Đang nuôi", BeingHarvested: "Đang thu hoạch", Harvested: "Đã thu hoạch" }[state] ?? state);
export function CyclesScreen() {
  const context = useApiWorkspace();
  const permitted = (action: string) => context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === action);
  const [starting, setStarting] = useState<{ id: string; code: string }>(), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const zones = useRemote(loadZones), mutation = useMutation();
  const [zoneId, setZoneId] = useState(""), [raft, setRaft] = useState<{ id: string; code: string }>(), [date, setDate] = useState(businessToday()), [cycleId, setCycleId] = useState("");
  const [progress, setProgress] = useState<z.infer<typeof cycleProgress>>();
  const list = useRemote(useCallback((signal: AbortSignal) => zoneId ? readCycles({ action: "zone", zoneId }, zoneCycles, signal) : Promise.resolve({ status: "success" as const, data: [] }), [zoneId]));
  const history = useRemote(useCallback((signal: AbortSignal) => raft ? readCycles({ action: "history", raftId: raft.id }, cycleHistory, signal) : Promise.resolve({ status: "success" as const, data: [] }), [raft]));
  async function showProgress(id: string, selectedCycle = "", selectedDate = businessToday()) {
    const next = await mutation.run(() => readCycles({ action: "progress", raftId: id, ...(selectedCycle ? { cycleId: selectedCycle } : { date: selectedDate }) }, cycleProgress), true);
    if (next) setProgress(next);
  }
  return <section><OperationHeading title="Chu kỳ nuôi" description="Theo dõi lịch sử chu kỳ và tiến độ từng làn của các bè trong vùng." icon="raft" />
    <div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-72"><Select label="Vùng nuôi" value={zoneId} onChange={e => { setZoneId(e.target.value); setRaft(undefined); setProgress(undefined); }}><option value="">Chọn vùng nuôi</option>{zones.data?.map(zone => <option key={zone.id} value={zone.id}>{String(zone.name)}</option>)}</Select></div><Button className="w-auto" variant="secondary" disabled={!zoneId || list.loading} onClick={list.reload}>Tải lại</Button></div>
    <ErrorNotice error={zones.error || list.error || mutation.error} />
    {notice && <p role="status" className="my-3 text-sm">{notice}</p>}
    {zoneId && permitted("Create") && <div className="my-3 flex flex-wrap gap-2">{list.data?.filter(row => row.canStart).map(row => <Button key={row.raftId} className="w-auto" variant="secondary" onClick={() => setStarting({ id: row.raftId, code: row.raftCode })}>Mở chu kỳ · {row.raftCode}</Button>)}</div>}
    {list.loading ? <Skeleton /> : !zoneId ? <p className="mt-6 text-sm text-text-muted">Chọn vùng để xem các bè và chu kỳ nuôi.</p> : <DataTable headings={["Bè", "Số làn", "Ngày bắt đầu", "Ngày kết thúc", "Chu kỳ", "Chi tiết"]} empty={!list.data?.length}>{list.data?.map(row => <tr key={row.raftId}><td>{row.raftCode}</td><td>{row.laneCount}</td><td>{row.cycle?.startDate ?? "—"}</td><td>{row.cycle?.closeDate ?? "—"}</td><td>{row.cycle ? row.cycle.closeDate ? "Đã kết thúc" : "Đang nuôi" : "Chưa có chu kỳ"}</td><td><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { setRaft({ id: row.raftId, code: row.raftCode }); setDate(businessToday()); setCycleId(""); setProgress(undefined); void showProgress(row.raftId); }}>Lịch sử và tiến độ</Button></td></tr>)}</DataTable>}
    {raft && <Dialog open title={`Lịch sử và tiến độ · ${raft.code}`} size="xl" onOpenChange={open => { if (!open) setRaft(undefined); }}><ErrorNotice error={history.error || mutation.error} />
      {progress?.cycle?.canEdit && permitted("Edit") && <Button className="mb-3 w-auto" variant="secondary" onClick={() => setEditing(true)}>Sửa kế hoạch chu kỳ</Button>}
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-52 flex-1"><Select label="Chu kỳ" value={cycleId} onChange={e => setCycleId(e.target.value)}><option value="">Theo ngày</option>{history.data?.map(cycle => <option key={cycle.id} value={cycle.id}>{cycle.startDate} → {cycle.closeDate ?? "Đang nuôi"}</option>)}</Select></div><Field label="Ngày xem" type="date" max={businessToday()} disabled={!!cycleId} value={date} onChange={e => setDate(e.target.value)} /><Button className="w-auto" disabled={mutation.pending || !cycleId && !date} onClick={() => void showProgress(raft.id, cycleId, date)}>Xem tiến độ</Button></div>
      {mutation.pending ? <Skeleton /> : progress && <><p className="my-4 text-sm">Ngày {progress.date} · {progress.cycle ? `${progress.cycle.daysOfFarming} ngày nuôi` : "Chưa có chu kỳ trong ngày này"}</p><DataTable headings={["Làn", "Trạng thái sử dụng", "Tiến độ"]} empty={!progress.lanes.length}>{progress.lanes.map(lane => <tr key={lane.id}><td>Làn {lane.laneNumber}</td><td>{lane.statusId === 2001 ? "Đang sử dụng" : "Đã gỡ"}</td><td>{laneState(lane.state)}</td></tr>)}</DataTable></>}
    </Dialog>}
    {(starting || editing && progress?.cycle) && <CycleEditor raftId={starting?.id ?? progress!.raftId} raftCode={starting?.code ?? progress!.raftCode} record={starting ? undefined : progress!.cycle!} canCancel={!!progress?.cycle?.canCancel && permitted("Delete")} onClose={() => { setStarting(undefined); setEditing(false); }} onSaved={() => { setStarting(undefined); setEditing(false); setRaft(undefined); setProgress(undefined); list.reload(); setNotice("Đã cập nhật chu kỳ nuôi."); }} />}
  </section>;
}

"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { CyclePlanSummary } from "./lane-board";
import { Button } from "@/components/ui/button";

import { ManagementHeading } from "@/components/ui/management-page";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationAllowed } from "@/features/operations/permissions";
import { loadOptions } from "@/features/operations/lookups";
import { DataTable, ErrorNotice, Field, Select, Skeleton, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { cycle, cycleSummary, cycleValues, zoneCycle, type Cycle, type ZoneCycle } from "./contracts";
import { RaftProgress } from "./progress";
const repo = createOperationsRepository("cultivation-cycles");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
export function CyclesScreen() {
  const context = useApiWorkspace(), zones = useRemote(loadZones);
  const [zoneId, setZone] = useState(""), [selected, setSelected] = useState<ZoneCycle>(), [editingRow, setEditingRow] = useState<ZoneCycle>();
  const available = zones.data?.filter(v => operationAllowed("cultivation-cycles", context.identity, context.permissions.functionPermissions, "View", v.id)) ?? [];
  const activeZone = String(zoneId || available[0]?.id || "");
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => activeZone ? repo.read("list", { zoneId: activeZone }, z.array(zoneCycle), signal) : Promise.resolve({ status: "success" as const, data: [] }), [activeZone]));
  if (editingRow) return <CycleDetail row={editingRow} zoneId={activeZone} onClose={() => setEditingRow(undefined)} onSaved={() => { setEditingRow(undefined); setSelected(undefined); rows.reload(); }} />;
  const current = rows.data?.find(row => row.raftId === selected?.raftId);
  return <section><ManagementHeading title="Chu kỳ nuôi" description="Chọn bè để xem các làn, kế hoạch và lịch sử ở khung bên phải." icon="raft" /><FilterWorkspace label="Vùng và bè nuôi" filters={<><Select label="Vùng nuôi" value={activeZone} onChange={e => { setZone(e.target.value); setSelected(undefined); }}><option value="">Chọn vùng nuôi</option>{available.map(v => <option key={v.id} value={v.id}>{String(v.name ?? v.code)}</option>)}</Select><Button className="w-auto" variant="secondary" onClick={() => { zones.reload(); rows.reload(); }}>Tải lại danh sách</Button><div className="space-y-2" role="group" aria-label="Chọn bè nuôi">{rows.data?.map(row => <button key={row.raftId} type="button" aria-label={`Xem bè ${row.raftCode}`} aria-pressed={current?.raftId === row.raftId} className="w-full rounded-control border border-border bg-surface p-3 text-left aria-pressed:border-primary aria-pressed:bg-primary-soft" onClick={() => setSelected(row)}><strong className="block text-sm">{row.raftCode}</strong><span className="mt-1 block text-xs text-text-muted">{row.laneCount} làn · {row.cycle ? row.cycle.closeDate ? "Đã kết thúc" : "Đang nuôi" : "Chưa có chu kỳ"}</span></button>)}</div></>}><ErrorNotice error={zones.error || rows.error} />{rows.loading ? <Skeleton /> : current ? <SelectedCycleOverview key={current.raftId} row={current} zoneId={activeZone} onManage={() => setEditingRow(current)} /> : <p className="py-8 text-sm text-text-muted">Chọn một bè bên trái để xem thông tin và tiến độ làn nuôi.</p>}</FilterWorkspace></section>;
}
function SelectedCycleOverview({ row, zoneId, onManage }: { row: ZoneCycle; zoneId: string; onManage(): void }) {
  const detail = useRemote(useMemo(() => (signal: AbortSignal) => row.cycle ? repo.read("detail", { id: row.cycle.id, zoneId }, cycle, signal) : Promise.resolve({ status: "success" as const, data: null }), [row.cycle, zoneId]));
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Bè {row.raftCode}</h2><p className="mt-1 text-sm text-text-muted">{row.laneCount} làn · {row.cycle ? `Chu kỳ từ ${formatVietnameseDate(row.cycle.startDate)}` : "Chưa có chu kỳ"}</p></div><Button className="w-auto" variant="secondary" onClick={onManage}>Kế hoạch và lịch sử chu kỳ</Button></div><ErrorNotice error={detail.error} />{detail.loading ? <Skeleton /> : detail.data && <CyclePlanSummary plan={detail.data} />}<RaftProgress raftId={row.raftId} zoneId={zoneId} /></section>;
}
function CycleDetail({ row, zoneId, onClose, onSaved }: { row: ZoneCycle; zoneId: string; onClose(): void; onSaved(): void }) {
  const context = useApiWorkspace();
  const detail = useRemote(useMemo(() => (signal: AbortSignal) => row.cycle ? repo.read("detail", { id: row.cycle.id, zoneId }, cycle, signal) : Promise.resolve({ status: "success" as const, data: null }), [row.cycle, zoneId]));
  const history = useRemote(useMemo(() => (signal: AbortSignal) => repo.read("history", { id: row.raftId, zoneId }, z.array(cycleSummary), signal), [row.raftId, zoneId]));
  return <section><ManagementHeading title={`Chu kỳ bè ${row.raftCode}`} description="Kế hoạch, lịch sử chu kỳ và tiến độ nuôi của bè." icon="raft" />{(detail.loading || detail.error) && <Button className="mb-4 w-auto" variant="secondary" onClick={onClose}>← Quay lại danh sách bè</Button>}<ErrorNotice error={detail.error || history.error} />{detail.error && <><Button variant="secondary" onClick={detail.reload}>Tải lại chu kỳ</Button><Button variant="secondary" onClick={onClose}>Đóng</Button></>}{detail.loading ? <Skeleton /> : !detail.error && <CycleForm key={detail.data?.rowVersion ?? "new"} row={row} record={detail.data ?? null} zoneId={zoneId} onClose={onClose} onSaved={onSaved} allowed={action => operationAllowed("cultivation-cycles", context.identity, context.permissions.functionPermissions, action, zoneId)} />}<h3 className="mt-6 font-semibold">Lịch sử chu kỳ</h3><DataTable headings={["Bắt đầu", "Kết thúc"]} empty={!history.data?.length}>{history.data?.map(v => <tr key={v.id}><td>{v.startDate}</td><td>{v.closeDate ?? "Đang nuôi"}</td></tr>)}</DataTable><RaftProgress raftId={row.raftId} zoneId={zoneId} /></section>;
}
function CycleForm({ row, record, zoneId, allowed, onClose, onSaved }: { row: ZoneCycle; record: Cycle | null; zoneId: string; allowed(action: string): boolean; onClose(): void; onSaved(): void }) {
  const initial = { startDate: record?.startDate ?? "", expectedSeedQuantity: String(record?.expectedSeedQuantity ?? ""), expectedHarvestDate: record?.expectedHarvestDate ?? "", targetYieldKg: String(record?.targetYieldKg ?? "") };
  const [values, setValues] = useState(initial), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, JSON.stringify(values) !== JSON.stringify(initial));
  const editable = record ? record.canEdit && allowed("Edit") : row.canStart && allowed("Create");
  async function save() {
    const parsed = cycleValues.safeParse({ startDate: values.startDate || null, expectedHarvestDate: values.expectedHarvestDate || null, expectedSeedQuantity: values.expectedSeedQuantity ? Number(values.expectedSeedQuantity) : null, targetYieldKg: values.targetYieldKg ? Number(values.targetYieldKg) : null });
    if (!parsed.success) { setError("Kiểm tra ngày và số lượng kế hoạch; số lượng phải lớn hơn 0."); return; }
    setError(undefined);
    if (await editor.submit(record ? "Lưu kế hoạch chu kỳ?" : "Mở chu kỳ nuôi cho bè này?", () => repo.write(record ? "edit" : "start", { ...parsed.data, ...(record ? { rowVersion: record.rowVersion } : {}) }, cycle, record?.id ?? row.raftId, zoneId))) onSaved();
  }
  return <div>{editor.dialog}<Button className="mb-4 w-auto" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>← Quay lại danh sách bè</Button><ErrorNotice error={error || editor.mutation.error} />{record && <p className="my-3 text-sm">{record.daysOfFarming} ngày nuôi · {record.closeDate ? "Đã kết thúc" : "Đang nuôi"}{record.assessment ? ` · ${record.assessment}` : ""}</p>}<form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={!editable || editor.disabled} className="grid gap-4 sm:grid-cols-2">{([["startDate", "Ngày bắt đầu", "date"], ["expectedSeedQuantity", "Số giống dự kiến", "number"], ["expectedHarvestDate", "Ngày thu hoạch dự kiến", "date"], ["targetYieldKg", "Sản lượng mục tiêu (kg)", "number"]] as const).map(([key, label, type]) => <Field key={key} label={label} type={type} step={key === "expectedSeedQuantity" ? "0.001" : "0.01"} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />)}{editable && <Button type="submit">{record ? "Lưu kế hoạch" : "Mở chu kỳ"}</Button>}</fieldset></form>{record?.canCancel && allowed("Delete") && <Button className="mt-4" variant="secondary" disabled={editor.disabled} onClick={async () => { if (await editor.submit("Hủy chu kỳ mở nhầm chưa phát sinh dữ liệu?", () => repo.write("cancel", { rowVersion: record.rowVersion }, z.object({ done: z.literal(true) }), record.id, zoneId))) onSaved(); }}>Hủy chu kỳ mở nhầm</Button>}{editor.mutation.blocked && <p role="alert" className="mt-3 text-sm">Bản nháp được giữ. Đóng và tải lại dữ liệu để đối chiếu trước khi thực hiện tiếp.</p>}<Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button></div>;
}

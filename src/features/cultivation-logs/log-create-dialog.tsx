"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { zoneCycles } from "@/features/cycles-api/contracts";
import { LogEditor } from "@/features/cycles-api/log-screen";
import { readCycles } from "@/features/cycles-api/repository";
import type { ZoneOption } from "@/features/input-issues/issue-access";
import { ErrorNotice, Select, Skeleton, useRemote } from "@/features/operations/ui";

/**
 * "+ Ghi nhật ký" of the Nhật ký screen: pick the zone and the raft (only a raft with an open cycle can take a log), then the existing log form opens for that cycle.
 * `onSaved` is called after the log is saved.
 */
export function LogCreateDialog({ zones, defaultZoneId, onClose, onSaved }: { zones: readonly ZoneOption[]; defaultZoneId?: string; onClose(): void; onSaved(): void }) {
  const [zoneId, setZoneId] = useState(defaultZoneId && zones.some(zone => zone.id === defaultZoneId) ? defaultZoneId : zones[0]?.id ?? ""), [raftId, setRaftId] = useState(""), [chosen, setChosen] = useState(false);
  const rows = useRemote(useCallback((signal: AbortSignal) => zoneId ? readCycles({ action: "zone", zoneId }, zoneCycles, signal) : Promise.resolve({ status: "success" as const, data: [] }), [zoneId]));
  const open = (rows.data ?? []).filter(row => row.cycle && !row.cycle.closeDate && row.raftStatusId === 101), raft = open.find(row => row.raftId === raftId);
  if (chosen && raft?.cycle) return <LogEditor cycleId={raft.cycle.id} startDate={raft.cycle.startDate} zoneId={zoneId} record={null} onClose={onClose} onSaved={onSaved} />;
  return <Dialog open title="Ghi nhật ký chăm sóc" onOpenChange={next => { if (!next) onClose(); }}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (raft) setChosen(true); }}>
      <Select label="Vùng nuôi *" required value={zoneId} onChange={event => { setZoneId(event.target.value); setRaftId(""); }}>
        {zones.map(zone => <option key={zone.id} value={zone.id}>{[zone.code, zone.name].filter(Boolean).join(" · ")}</option>)}
      </Select>
      {rows.loading ? <Skeleton /> : <Select label="Bè *" required value={raftId} onChange={event => setRaftId(event.target.value)}>
        <option value="">{open.length ? "Chọn bè" : "Vùng này chưa có bè nào đang có chu kỳ mở"}</option>
        {open.map(row => <option key={row.raftId} value={row.raftId}>{row.raftCode}</option>)}
      </Select>}
      <ErrorNotice error={rows.error} />
      <p className="text-xs text-text-muted">Chỉ bè đang có chu kỳ nuôi mở mới ghi được nhật ký chăm sóc.</p>
      <div className="flex justify-end gap-3"><Button type="button" variant="secondary" className="w-auto" onClick={onClose}>Bỏ qua</Button>
        <Button type="submit" className="w-auto" disabled={!raft}>Tiếp tục</Button></div>
    </form>
  </Dialog>;
}

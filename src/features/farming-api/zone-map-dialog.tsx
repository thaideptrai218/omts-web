"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { mapPointUrl, type MapZone } from "./zone-map-contract";
import { readZoneMap } from "./zone-map-repository";

function Point({ point }: { point: { latitude: number | null; longitude: number | null } }) {
  const href = mapPointUrl(point);
  return href ? <span className="flex flex-wrap gap-3"><span>{point.latitude}, {point.longitude}</span><a className="text-primary underline" href={href} target="_blank" rel="noopener noreferrer">Mở Google Maps</a></span> : <span>Chưa đủ tọa độ</span>;
}
export function ZoneMapDialog({ onClose }: { onClose(): void }) {
  const [include, setInclude] = useState(false), [search, setSearch] = useState(""), [serial, setSerial] = useState(0);
  const [zones, setZones] = useState<MapZone[]>(), [error, setError] = useState<string>(), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setZones(undefined); setError(undefined);
      const result = await readZoneMap(include, controller.signal);
      if (controller.signal.aborted) return;
      setLoading(false);
      if (result.status === "success") setZones(result.data); else setError(workspaceError(result));
    });
    return () => controller.abort();
  }, [include, serial]);
  const term = search.trim().toLocaleLowerCase("vi");
  const visible = zones?.flatMap((zone) => {
    const matchesZone = `${zone.code} ${zone.name}`.toLocaleLowerCase("vi").includes(term);
    const rafts = matchesZone ? zone.rafts : zone.rafts.filter((raft) => raft.code.toLocaleLowerCase("vi").includes(term));
    return matchesZone || rafts.length ? [{ ...zone, rafts }] : [];
  });
  return <Dialog open title="Vị trí vùng và bè" size="lg" onOpenChange={(open) => { if (!open) onClose(); }}>
    <div className="flex flex-wrap items-end gap-4"><label className="flex-1">Tìm mã vùng, tên vùng hoặc mã bè<input className="mt-2 min-h-12 w-full rounded-control border border-border-strong p-3" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="py-3"><input type="checkbox" checked={include} onChange={(event) => setInclude(event.target.checked)} /> Bao gồm vùng ngừng dùng</label>
      <Button className="w-auto" variant="secondary" disabled={loading} onClick={() => setSerial((value) => value + 1)}>Tải lại</Button></div>
    <p className="mt-3 text-sm text-text-muted">Danh sách bè đang dùng. Liên kết Google Maps mở trong tab mới.</p>
    {loading && <div role="status" className="mt-4 animate-pulse space-y-3"><span className="sr-only">Đang tải vị trí</span>{[1, 2, 3].map((key) => <div key={key} className="h-16 rounded-control bg-border" />)}</div>}
    {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    {visible && !visible.length && <p className="mt-4">Không có vị trí phù hợp.</p>}
    <div className="mt-4 space-y-4">{visible?.map((zone) => <section key={zone.id} className="rounded-control border border-border p-4">
      <h3 className="font-semibold">{zone.code} · {zone.name}</h3><p className="my-2 text-sm">{zone.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}</p><Point point={zone} />
      {!zone.rafts.length && <p className="mt-3 text-sm text-text-muted">Không có bè đang dùng phù hợp.</p>}
      <ul className="mt-3 space-y-3">{zone.rafts.map((raft) => <li key={raft.id} className="border-t border-border pt-3"><strong>{raft.code}</strong><Point point={raft} /></li>)}</ul>
    </section>)}</div>
    <Button className="mt-5 w-auto" variant="secondary" onClick={onClose}>Đóng</Button>
  </Dialog>;
}

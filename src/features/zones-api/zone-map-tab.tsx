"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { MapSelection } from "@/features/farming-api/vietmap-view";
import type { MapZone } from "@/features/farming-api/zone-map-contract";
import { Skeleton, useRemote } from "@/features/operations/ui";
import type { ZoneDetail } from "./zone-model";
import { readZoneRafts, skipped } from "./zone-summary-reads";
import type { ZoneRaft } from "./zone-summary-model";
import styles from "./zone-kpi.module.css";

const VietMapView = dynamic(() => import("@/features/farming-api/vietmap-view"), { ssr: false, loading: () => <Skeleton /> });
const hasPoint = (point: { latitude?: number | null; longitude?: number | null }) => typeof point.latitude === "number" && typeof point.longitude === "number";

/**
 * "Bản đồ": the zone pin and its rafts that have coordinates. "Toàn cảnh" lifts the same map into a fixed overlay on `document.body`
 * (so no ancestor can clip it); Esc or "Thu gọn" brings it back and returns focus to the button that opened it.
 */
export function ZoneMapTab({ zone, canSeeRafts, onOpenRaft }: { zone: ZoneDetail; canSeeRafts: boolean; onOpenRaft(raftId: string): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => canSeeRafts ? readZoneRafts(zone.id, signal) : skipped<ZoneRaft[]>([]), [zone.id, canSeeRafts]));
  const [expanded, setExpanded] = useState(false), [selection, setSelection] = useState<MapSelection>();
  const opener = useRef<HTMLButtonElement>(null), closer = useRef<HTMLButtonElement>(null);
  const rafts = remote.data;
  const mapZones = useMemo<MapZone[]>(() => hasPoint(zone) ? [{ id: zone.id, code: zone.code, name: zone.name, latitude: zone.latitude, longitude: zone.longitude, statusId: zone.statusId, status: zone.status,
    rafts: (rafts ?? []).flatMap(raft => hasPoint(raft) ? [{ id: raft.id, code: raft.code, latitude: raft.latitude ?? null, longitude: raft.longitude ?? null }] : []) }] : [], [zone, rafts]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); setExpanded(false); } };
    document.addEventListener("keydown", onKey, true);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey, true); };
  }, [expanded]);
  // Back from the overlay, focus returns to the button that opened it.
  const wasExpanded = useRef(false);
  useEffect(() => { if (wasExpanded.current && !expanded) opener.current?.focus(); wasExpanded.current = expanded; }, [expanded]);

  if (remote.loading) return <Skeleton />;
  if (remote.error || !rafts) return <ListStateMessage error={remote.error ?? "Không tải được vị trí bè."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const total = rafts.length, placed = mapZones[0]?.rafts.length ?? 0;
  const pick = (value: MapSelection) => setSelection(value);
  const toolbar = <div className={styles.mapBar}>
    <span>{hasPoint(zone) ? `Vùng ${zone.code}: ${zone.latitude}, ${zone.longitude}` : "Vùng chưa có tọa độ"}{canSeeRafts ? ` · ${placed}/${total} bè có tọa độ` : ""}</span>
    {expanded ? <Button key="collapse" ref={closer} type="button" variant="secondary" className="w-auto" onClick={() => setExpanded(false)}>Thu gọn</Button>
      : <Button key="expand" ref={opener} type="button" variant="secondary" className="w-auto" onClick={() => setExpanded(true)}>Toàn cảnh</Button>}
  </div>;
  const stage = <div className={styles.mapStage}>
    <VietMapView zones={mapZones} fill={expanded} onSelect={pick} />
    {selection && <div className={styles.pick} role="group" aria-label="Vị trí đang chọn"><strong>{selection.label}</strong>
      {selection.kind === "rafts" && <Button key="view-raft" type="button" className="w-auto" onClick={() => { setExpanded(false); onOpenRaft(selection.id); }}>Xem bè</Button>}
      <Button key="close-pick" type="button" variant="secondary" className="w-auto" aria-label="Đóng" onClick={() => setSelection(undefined)}>×</Button></div>}
  </div>;
  return expanded
    ? <>{createPortal(<div className={styles.expanded} role="region" aria-label="Bản đồ toàn cảnh của vùng">{toolbar}{stage}</div>, document.body)}</>
    : <>{toolbar}{stage}</>;
}

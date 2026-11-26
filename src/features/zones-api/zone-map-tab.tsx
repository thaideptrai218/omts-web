"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { MapSelection } from "@/features/farming-api/vietmap-view";
import { isOutsideBoundary } from "@/features/farming-api/boundary-geometry";
import type { MapZone } from "@/features/farming-api/zone-map-contract";
import { readZoneMap } from "@/features/farming-api/zone-map-repository";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { IN_USE, type ZoneDetail } from "./zone-model";
import styles from "./zone-tabs.module.css";

const VietMapView = dynamic(() => import("@/features/farming-api/vietmap-view"), { ssr: false, loading: () => <Skeleton /> });
const hasPoint = (point: { latitude: number | null; longitude: number | null }) => typeof point.latitude === "number" && typeof point.longitude === "number";

/**
 * "Bản đồ": the licensed area (one polygon per khu) and the rafts of the zone that have coordinates, from one map read; rafts outside the area are
 * highlighted. The zone marker appears only for a zone without a boundary that still has a pin. "Toàn cảnh" lifts the same map into a fixed overlay on `document.body`
 * (so no ancestor can clip it); Esc or "Thu gọn" brings it back and returns focus to the button that opened it.
 */
export function ZoneMapTab({ zone, canSeeRafts, onOpenRaft }: { zone: ZoneDetail; canSeeRafts: boolean; onOpenRaft(raft: { id: string; code: string }): void }) {
  // The map read lists In Use zones; a discontinued zone asks for the whole list and picks itself out.
  const remote = useRemote(useCallback((signal: AbortSignal) => readZoneMap(zone.statusId !== IN_USE, signal), [zone.statusId]));
  const [expanded, setExpanded] = useState(false), [selection, setSelection] = useState<MapSelection>();
  const opener = useRef<HTMLButtonElement>(null), closer = useRef<HTMLButtonElement>(null);
  const row = remote.data?.find(item => item.id === zone.id);
  const mapZone = useMemo<MapZone | undefined>(() => row && { ...row, ...(row.boundary ? { latitude: null, longitude: null } : {}), rafts: canSeeRafts ? row.rafts : [] }, [row, canSeeRafts]);
  const mapZones = useMemo(() => mapZone && (mapZone.boundary || hasPoint(mapZone) || mapZone.rafts.some(hasPoint)) ? [mapZone] : [], [mapZone]);

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
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được bản đồ vùng."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const rafts = mapZone?.rafts ?? [], placed = rafts.filter(hasPoint).length;
  const outside = rafts.filter(raft => raft.latitude !== null && raft.longitude !== null && isOutsideBoundary({ latitude: raft.latitude, longitude: raft.longitude }, mapZone?.boundary)).length;
  const where = mapZone?.boundary ? `${mapZone.boundary.features.length} khu theo sơ đồ cấp phép` : mapZone && hasPoint(mapZone) ? `${mapZone.latitude}, ${mapZone.longitude}` : "chưa có ranh giới hoặc tọa độ";
  const pick = (value: MapSelection) => setSelection(value);
  const toolbar = <div className={styles.mapBar}>
    <span>{`Vùng ${zone.code}: ${where}`}{canSeeRafts ? ` · ${placed}/${rafts.length} bè có tọa độ` : ""}{outside > 0 ? ` · ${outside} bè ngoài ranh giới` : ""}</span>
    {expanded ? <Button key="collapse" ref={closer} type="button" variant="secondary" className="w-auto" onClick={() => setExpanded(false)}>Thu gọn</Button>
      : <Button key="expand" ref={opener} type="button" variant="secondary" className="w-auto" onClick={() => setExpanded(true)}>Toàn cảnh</Button>}
  </div>;
  const stage = <div className={styles.mapStage}>
    <VietMapView zones={mapZones} fill={expanded} onSelect={pick} />
    {selection && <div className={styles.pick} role="group" aria-label="Vị trí đang chọn"><strong>{selection.label}</strong>
      {selection.kind === "rafts" && <Button key="view-raft" type="button" className="w-auto" onClick={() => { setExpanded(false); onOpenRaft({ id: selection.id, code: rafts.find(raft => raft.id === selection.id)?.code ?? "" }); }}>Xem bè</Button>}
      <Button key="close-pick" type="button" variant="secondary" className="w-auto" aria-label="Đóng" onClick={() => setSelection(undefined)}>×</Button></div>}
  </div>;
  return expanded
    ? <>{createPortal(<div className={styles.expanded} role="region" aria-label="Bản đồ toàn cảnh của vùng">{toolbar}{stage}</div>, document.body)}</>
    : <>{toolbar}{stage}</>;
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as VietMap } from "@vietmap/vietmap-gl-js/dist/vietmap-gl";
import "@vietmap/vietmap-gl-js/dist/vietmap-gl.css";
import { Button } from "@/components/ui/button";
import type { MapZone } from "./zone-map-contract";
const apiKey = process.env.NEXT_PUBLIC_VIETMAP_API_KEY?.trim();
export type MapSelection = { kind: "zones" | "rafts"; id: string; zoneId: string; label: string };
function coordinate(point: { latitude: number | null; longitude: number | null }): [number, number] | undefined {
  return typeof point.latitude === "number" && typeof point.longitude === "number" && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180 ? [point.longitude, point.latitude] : undefined;
}
function failure(cause: unknown) {
  const event = cause as { status?: number; error?: { status?: number } } | undefined;
  const status = event?.status ?? event?.error?.status;
  if (status === 423 || status === 429) return "Dịch vụ bản đồ đang giới hạn lượt truy cập. Vui lòng thử lại sau.";
  if (status === 401 || status === 403) return "Dịch vụ bản đồ chưa cấp quyền cho trang này. Vui lòng liên hệ quản trị viên.";
  return "Chưa tải được bản đồ. Bạn vẫn có thể xem danh sách vị trí bên dưới.";
}
export default function VietMapView({ zones, onSelect, fill }: { zones: MapZone[]; onSelect?(selection: MapSelection): void; fill?: boolean }) {
  const container = useRef<HTMLDivElement>(null), [attempt, setAttempt] = useState(0), [ready, setReady] = useState(false), [error, setError] = useState<string>(), [selected, setSelected] = useState<MapSelection>();
  const selectRef = useRef(onSelect);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  const points = useMemo(() => zones.flatMap(zone => {
    const result: { position: [number, number]; selection: MapSelection; active: boolean }[] = [];
    const position = coordinate(zone);
    if (position) result.push({ position, selection: { kind: "zones", id: zone.id, zoneId: zone.id, label: `${zone.code} · ${zone.name}` }, active: zone.statusId === 101 });
    for (const raft of zone.rafts) { const pos = coordinate(raft); if (pos) result.push({ position: pos, selection: { kind: "rafts", id: raft.id, zoneId: zone.id, label: `Bè ${raft.code} · ${zone.name}` }, active: true }); }
    return result;
  }), [zones]);
  useEffect(() => {
    if (!apiKey || !points.length || !container.current) return;
    let map: VietMap | undefined, observer: ResizeObserver | undefined, disposed = false, loaded = false;
    const events = new AbortController();
    const timeout = setTimeout(() => { if (!disposed && !loaded) setError("Bản đồ đang tải lâu hơn dự kiến. Hãy kiểm tra kết nối hoặc thử lại."); }, 12_000);
    void import("@vietmap/vietmap-gl-js/dist/vietmap-gl").then(({ default: sdk }) => {
      if (disposed || !container.current) return;
      setReady(false); setError(undefined); setSelected(undefined);
      try {
        map = new sdk.Map({ container: container.current, style: `https://maps.vietmap.vn/maps/styles/hm/style.json?apikey=${encodeURIComponent(apiKey)}`, center: points[0].position, zoom: 15, attributionControl: {} });
        map.addControl(new sdk.NavigationControl(), "top-right");
        map.on("error", cause => { if (!disposed) setError(failure(cause)); });
        map.on("load", () => {
          if (disposed || !map) return;
          loaded = true; clearTimeout(timeout);
          const bounds = new sdk.LngLatBounds();
          for (const point of points) {
            const pin = document.createElement("button");
            pin.type = "button"; pin.textContent = point.selection.kind === "zones" ? `Vùng ${point.selection.label.split(" · ")[0]}` : point.selection.label.split(" · ")[0];
            pin.setAttribute("aria-label", `Xem ${point.selection.label}`);
            pin.style.cssText = `max-width:180px;padding:7px 10px;border:2px solid white;border-radius:8px;background:${point.selection.kind === "zones" ? point.active ? "#10243A" : "#64748b" : "#086F78"};color:white;font:600 12px system-ui;box-shadow:0 3px 10px #10243a40;cursor:pointer;overflow-wrap:anywhere`;
            pin.style.zIndex = point.selection.kind === "zones" ? "2" : "1";
            pin.addEventListener("click", () => { setSelected(point.selection); selectRef.current?.(point.selection); }, { signal: events.signal });
            new sdk.Marker({ element: pin, anchor: "bottom" }).setLngLat(point.position).addTo(map);
            bounds.extend(point.position);
          }
          map.fitBounds(bounds, { padding: 56, maxZoom: 17, duration: 0 }); map.resize(); setReady(true);
        });
        if (typeof ResizeObserver !== "undefined") { observer = new ResizeObserver(() => map?.resize()); observer.observe(container.current); }
      } catch { if (!disposed) setError(failure(undefined)); }
    }).catch(() => { if (!disposed) setError(failure(undefined)); });
    return () => {
      disposed = true; clearTimeout(timeout); events.abort(); observer?.disconnect();
      // The SDK detaches Style from Map during remove(). Its pending fetch can
      // then emit AbortError on Style with no listener, producing console.error.
      // Listen on that disposing instance, not on window or the global console.
      map?.style?.on("error", (event) => {
        if (event.error?.name !== "AbortError" && event.error?.message !== "AbortError") {
          console.warn("Chưa hoàn tất việc đóng bản đồ.");
        }
      });
      map?.remove();
    };
  }, [points, attempt]);
  if (!apiKey) return <p className="my-4 rounded-control bg-surface-subtle p-4 text-sm">Bản đồ chưa được cấu hình. Bạn vẫn có thể xem tọa độ và mở vị trí bên dưới.</p>;
  if (!points.length) return <p className="my-4 text-sm text-text-muted">Các vùng và bè phù hợp bộ lọc chưa có tọa độ hợp lệ để hiển thị trên bản đồ.</p>;
  return <section className={fill ? "flex h-full min-h-0 min-w-0 flex-col" : "my-4 min-w-0"}><div className="mb-2 flex flex-wrap gap-4 text-xs text-text-muted"><span>● Vùng nuôi</span><span className="text-primary">● Bè đang dùng</span><span>{points.length} vị trí có tọa độ</span></div><div ref={container} role="region" aria-label="Bản đồ vùng và bè nuôi" className={fill ? "min-h-0 w-full flex-1 overflow-hidden rounded-card border border-border" : "h-[360px] w-full overflow-hidden rounded-card border border-border sm:h-[460px]"} />{!ready && !error && <p role="status" className="mt-2 text-sm">Đang tải bản đồ…</p>}{error && <div className="mt-3 space-y-2"><p role="alert" className="text-sm text-danger">{error}</p><Button className="w-auto" variant="secondary" onClick={() => setAttempt(v => v+1)}>Thử tải bản đồ lại</Button></div>}{selected && !onSelect && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-surface-subtle p-3"><p className="text-sm font-medium">{selected.label}</p><a className="text-sm font-semibold text-primary underline" href={`/workspace/${selected.kind}?recordId=${encodeURIComponent(selected.id)}`}>Mở hồ sơ</a></div>}</section>;
}

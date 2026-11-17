"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as VietMap, Marker } from "@vietmap/vietmap-gl-js/dist/vietmap-gl";
import "@vietmap/vietmap-gl-js/dist/vietmap-gl.css";
import { Button } from "@/components/ui/button";
import { apiKey, failure } from "./vietmap-view";
import type { ContextPin, PickerPoint } from "./location-picker-model";

/** No point and no context pins yet: show the whole country instead of guessing a place. */
const COUNTRY_CENTER: [number, number] = [106.0, 16.0];
const lngLat = (point: PickerPoint): [number, number] => [point.longitude, point.latitude];
const mapFailure = (cause: unknown) => failure(cause).replace("Bạn vẫn có thể xem danh sách vị trí bên dưới.", "Hãy kiểm tra kết nối và thử lại.");

/**
 * Compact map where a click or a drag places one marker. Context pins (zone, sibling rafts) are plain labels for orientation.
 * `value` is controlled by the parent so keyboard nudging and "current location" move the same marker.
 */
export default function LocationPickerMap({ value, center, pins, onPick, onCenterChange, fill }: { value?: PickerPoint; center?: PickerPoint; pins: readonly ContextPin[]; onPick(point: PickerPoint): void; onCenterChange(point: PickerPoint): void; fill: boolean }) {
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<VietMap>(null), markerRef = useRef<Marker>(null), pickRef = useRef(onPick);
  const initial = useRef({ value, pins, center });
  const centerRef = useRef(onCenterChange);
  const [attempt, setAttempt] = useState(0), [ready, setReady] = useState(false), [error, setError] = useState<string>();
  useEffect(() => { pickRef.current = onPick; }, [onPick]);
  useEffect(() => { centerRef.current = onCenterChange; }, [onCenterChange]);

  useEffect(() => {
    const key = apiKey;
    if (!key || !container.current) return;
    let map: VietMap | undefined, observer: ResizeObserver | undefined, disposed = false, loaded = false;
    const pinMarkers: Marker[] = [];
    const timeout = setTimeout(() => { if (!disposed && !loaded) setError("Bản đồ đang tải lâu hơn dự kiến. Hãy kiểm tra kết nối hoặc thử lại."); }, 12_000);
    void import("@vietmap/vietmap-gl-js/dist/vietmap-gl").then(({ default: sdk }) => {
      if (disposed || !container.current) return;
      setReady(false); setError(undefined);
      try {
        const { value: start, pins: around, center: fallback } = initial.current;
        const first = start ? lngLat(start) : around[0] ? lngLat(around[0]) : fallback ? lngLat(fallback) : COUNTRY_CENTER;
        map = new sdk.Map({ container: container.current, style: `https://maps.vietmap.vn/maps/styles/hm/style.json?apikey=${encodeURIComponent(key)}`, center: first, zoom: start || around.length || fallback ? 15 : 5, attributionControl: {} });
        mapRef.current = map;
        // Arrow keys belong to the accessible picker wrapper, rather than moving the map behind the marker.
        map.keyboard.disable();
        map.getCanvas().setAttribute("tabindex", "-1");
        map.addControl(new sdk.NavigationControl(), "top-right");
        map.on("error", cause => { if (!disposed) setError(mapFailure(cause)); });
        map.on("click", event => { const point = event.lngLat.wrap(); pickRef.current({ latitude: point.lat, longitude: point.lng }); });
        map.on("moveend", () => { if (map) { const point = map.getCenter().wrap(); centerRef.current({ latitude: point.lat, longitude: point.lng }); } });
        map.on("load", () => {
          if (disposed || !map) return;
          loaded = true; clearTimeout(timeout);
          for (const pin of around) {
            const label = document.createElement("span");
            label.textContent = pin.label;
            label.style.cssText = `padding:4px 8px;border:2px solid white;border-radius:8px;background:${pin.kind === "zone" ? "#10243A" : "#086F78"};color:white;font:600 11px system-ui;box-shadow:0 3px 10px #10243a40;pointer-events:none;white-space:nowrap`;
            pinMarkers.push(new sdk.Marker({ element: label, anchor: "bottom" }).setLngLat(lngLat(pin)).addTo(map));
          }
          const marker = new sdk.Marker({ draggable: true, color: "#B3261E" }).setLngLat(start ? lngLat(start) : first).addTo(map);
          marker.on("dragend", () => { const at = marker.getLngLat().wrap(); pickRef.current({ latitude: at.lat, longitude: at.lng }); });
          markerRef.current = marker;
          // No chosen point yet: frame the context pins; the marker is only shown once a point exists.
          if (!start) marker.getElement().style.display = "none";
          const at = map.getCenter().wrap(); centerRef.current({ latitude: at.lat, longitude: at.lng });
          map.resize(); setReady(true);
        });
        if (typeof ResizeObserver !== "undefined") { observer = new ResizeObserver(() => map?.resize()); observer.observe(container.current); }
      } catch { if (!disposed) setError(mapFailure(undefined)); }
    }).catch(() => { if (!disposed) setError(mapFailure(undefined)); });
    return () => {
      disposed = true; clearTimeout(timeout); observer?.disconnect();
      // The SDK can emit an AbortError from a pending style fetch while removing; swallow only that one.
      map?.style?.on("error", event => { if (event.error?.name !== "AbortError" && event.error?.message !== "AbortError") console.warn("Chưa hoàn tất việc đóng bản đồ."); });
      mapRef.current = null; markerRef.current = null;
      map?.remove();
    };
  }, [attempt]);

  // Keep the marker on the controlled value (click, drag, arrows, current location, clear).
  useEffect(() => {
    const marker = markerRef.current, map = mapRef.current;
    if (!ready || !marker || !map) return;
    if (!value) { marker.getElement().style.display = "none"; return; }
    marker.getElement().style.display = "";
    marker.setLngLat(lngLat(value));
    if (!map.getBounds().contains(lngLat(value))) map.easeTo({ center: lngLat(value), duration: 300 });
  }, [value, ready]);

  if (!apiKey) return <p className="rounded-control bg-surface-subtle p-4 text-sm">Bản đồ chưa được cấu hình nên chưa thể chọn vị trí.</p>;
  return <div className={fill ? "flex min-h-0 flex-1 flex-col" : ""}>
    <div ref={container} role="region" aria-label="Bản đồ chọn vị trí" className={fill ? "min-h-0 w-full flex-1 overflow-hidden rounded-card border border-border" : "h-[260px] w-full overflow-hidden rounded-card border border-border sm:h-[320px]"} />
    {!ready && !error && <p role="status" className="mt-2 text-sm">Đang tải bản đồ…</p>}
    {error && <div className="mt-2 space-y-2"><p role="alert" className="text-sm text-danger">{error}</p><Button type="button" className="w-auto" variant="secondary" onClick={() => setAttempt(v => v + 1)}>Thử tải bản đồ lại</Button></div>}
  </div>;
}

"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/features/operations/ui";
import { describePoint, draftOfPoint, nudgeOfKey, nudgePoint, pointOfDraft, type ContextPin, type PickerPoint } from "./location-picker-model";
import { LocationPickerOverlay } from "./location-picker-overlay";
import { useLocationDefault } from "./use-location-default";

const LocationPickerMap = dynamic(() => import("./location-picker-map"), { ssr: false, loading: () => <Skeleton /> });

/**
 * Replaces the two typed coordinate inputs: the point is chosen on a map and written back as the same two draft strings.
 * Click or drag places the marker; arrow keys nudge it (Shift = 10x) while the map area has focus; Enter confirms.
 * A native top-layer dialog keeps the expanded map above any parent modal and traps focus.
 */
export function LocationPicker({ latitude, longitude, onChange, pins = [], center, error, id }: {
  latitude: string; longitude: string; onChange(next: { latitude: string; longitude: string }): void;
  pins?: readonly ContextPin[]; center?: PickerPoint; error?: string; id: string;
}) {
  const value = pointOfDraft(latitude, longitude);
  const [expanded, setExpanded] = useState(false), [note, setNote] = useState(""), [locating, setLocating] = useState(false);
  const defaults = useLocationDefault();
  const mapCenter = useRef<PickerPoint | undefined>(undefined), root = useRef<HTMLDivElement>(null), request = useRef(0);
  const opener = useRef<HTMLButtonElement>(null), closer = useRef<HTMLButtonElement>(null), wasExpanded = useRef(false);
  const disabled = () => !!root.current?.closest("fieldset[disabled]");
  const set = (point: PickerPoint) => { if (!disabled()) { request.current += 1; setLocating(false); onChange(draftOfPoint(point)); setNote(describePoint(point)); } };

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expanded]);
  useEffect(() => { if (wasExpanded.current && !expanded) opener.current?.focus(); wasExpanded.current = expanded; }, [expanded]);
  useEffect(() => () => { request.current += 1; }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target instanceof Element && event.target.closest("button")) || disabled()) return;
    if (event.key === "Enter") { event.preventDefault(); setNote(value ? `Đã chọn vị trí. ${describePoint(value)}` : "Chưa có vị trí để xác nhận. Nhấp vào bản đồ để chọn."); return; }
    const step = nudgeOfKey(event.key, event.shiftKey);
    if (!step) return;
    event.preventDefault();
    const start = value ?? mapCenter.current ?? center ?? pins[0] ?? defaults.center;
    if (start) set(nudgePoint(start, step[0], step[1]));
    else setNote("Bản đồ đang tải. Hãy thử lại khi bản đồ đã sẵn sàng.");
  }
  function locateMe() {
    if (disabled()) return;
    if (!navigator.geolocation) { setNote("Trình duyệt này không hỗ trợ lấy vị trí hiện tại."); return; }
    setLocating(true);
    setNote("Đang lấy vị trí hiện tại…");
    const token = ++request.current;
    navigator.geolocation.getCurrentPosition(
      position => { if (token !== request.current) return; setLocating(false); set({ latitude: position.coords.latitude, longitude: position.coords.longitude }); },
      failure => { if (token !== request.current) return; setLocating(false); setNote(failure.code === 1 ? "Bạn chưa cho phép truy cập vị trí. Hãy cho phép trong cài đặt trình duyệt hoặc chọn trên bản đồ." : "Chưa lấy được vị trí hiện tại. Hãy thử lại hoặc chọn trên bản đồ."); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  }

  const caption = value ? describePoint(value) : "Chưa chọn vị trí";
  const content = <div className={expanded ? "flex h-full min-h-0 flex-col gap-2" : "min-w-0"} role="group" aria-label="Vị trí trên bản đồ">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p id={`${id}-caption`} className="text-sm font-medium">{caption}</p>
      <div className="flex flex-wrap gap-2">
        <Button key="locate" type="button" variant="secondary" className="w-auto" isPending={locating} onClick={locateMe}>Dùng vị trí hiện tại của tôi</Button>
        {value && <Button key="clear" type="button" variant="secondary" className="w-auto" onClick={() => { if (disabled()) return; request.current += 1; setLocating(false); onChange({ latitude: "", longitude: "" }); setNote("Đã xóa vị trí."); }}>Xóa vị trí</Button>}
        {expanded ? <Button key="collapse" ref={closer} type="button" variant="secondary" className="w-auto" onClick={() => setExpanded(false)}>Thu gọn</Button>
          : <Button key="expand" ref={opener} type="button" variant="secondary" className="w-auto" onClick={() => setExpanded(true)}>Toàn cảnh</Button>}
      </div>
    </div>
    {/* tabIndex makes the map area a keyboard target for nudging; the hint is read when it receives focus. */}
    <div tabIndex={0} onKeyDown={onKeyDown} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-label="Điểm chọn trên bản đồ" role="group" className={expanded ? "flex min-h-0 flex-1 flex-col rounded-card focus-visible:outline-2 focus-visible:outline-primary" : "rounded-card focus-visible:outline-2 focus-visible:outline-primary"}>
      {defaults.loading && !value && !pins.length && !center ? <Skeleton /> : <LocationPickerMap value={value} center={center ?? defaults.center} pins={pins} onPick={set} onCenterChange={point => { mapCenter.current = point; }} fill={expanded} />}
    </div>
    <p id={`${id}-hint`} className="mt-2 text-xs text-text-muted">Nhấp hoặc kéo ghim đỏ để chọn vị trí. Khi bản đồ đang được chọn, phím mũi tên nhích ghim, Shift nhích nhanh hơn, Enter xác nhận.</p>
    <p aria-live="polite" className="text-xs text-text-muted">{note}</p>
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">{error}</p>}
  </div>;
  return <div ref={root}>{expanded ? <LocationPickerOverlay onClose={() => setExpanded(false)}>{content}</LocationPickerOverlay> : content}</div>;
}

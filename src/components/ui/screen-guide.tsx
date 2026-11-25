"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

export type GuideStep = Readonly<{ title: string; text: string }>;

const seenKey = (id: string) => `omts.guide.${id}.seen`;
const CHANGED = "omts-guide-changed";

/** Storage can throw (private window, blocked site data); a guide that cannot remember simply keeps its "new" dot. */
function wasSeen(id: string) {
  try { return window.localStorage.getItem(seenKey(id)) === "1"; } catch { return false; }
}
function markSeen(id: string) {
  try { window.localStorage.setItem(seenKey(id), "1"); } catch { /* not remembered */ }
  window.dispatchEvent(new Event(CHANGED));
}
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(CHANGED, onChange); window.removeEventListener("storage", onChange); };
}

/**
 * "Hướng dẫn": a small round button fixed at the bottom right of the screen. It opens a short step by step guide (one step at a time,
 * Trước / Tiếp, dots showing where you are) and never takes room from the screen itself. A dot on the button marks a guide not opened yet;
 * the choice is kept per screen `id` in this browser. Pure guidance: it never blocks or changes anything on the screen.
 */
export function ScreenGuide({ id, title = "Hướng dẫn", steps }: { id: string; title?: string; steps: readonly GuideStep[] }) {
  const seen = useSyncExternalStore(subscribe, () => wasSeen(id), () => true);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!steps.length) return null;
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const show = () => { setIndex(0); setOpen(true); markSeen(id); };
  return <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
    {open && <section role="dialog" aria-label={title} className="w-[min(340px,calc(100vw-32px))] rounded-control border border-border bg-surface p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-text-muted">{title} · Bước {index + 1}/{steps.length}</p>
        <button type="button" className="-mr-1 -mt-1 flex size-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-subtle" aria-label="Đóng" onClick={() => setOpen(false)}>×</button>
      </div>
      <h2 className="mt-2 text-base font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-text-muted">{step.text}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <ol className="flex gap-1.5" aria-hidden>
          {steps.map((entry, position) => <li key={entry.title} className={`size-2 rounded-full ${position === index ? "bg-primary" : "bg-border"}`} />)}
        </ol>
        <div className="flex gap-2">
          {index > 0 && <button type="button" className="rounded-control border border-border px-3 py-1.5 text-sm" onClick={() => setIndex(index - 1)}>Trước</button>}
          <button type="button" className="rounded-control bg-primary px-3 py-1.5 text-sm font-semibold text-white" onClick={() => (last ? setOpen(false) : setIndex(index + 1))}>{last ? "Xong" : "Tiếp"}</button>
        </div>
      </div>
    </section>}
    <button type="button" aria-expanded={open} aria-label={open ? "Đóng hướng dẫn" : "Xem hướng dẫn"} onClick={() => (open ? setOpen(false) : show())}
      className="relative flex size-11 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white shadow-lg hover:brightness-95">
      ?
      {!seen && <span aria-hidden className="absolute right-0 top-0 size-3 rounded-full border-2 border-white bg-danger" />}
    </button>
  </div>;
}

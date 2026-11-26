"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * A step of the guide. `target` points at the part of the screen the step talks about and that part is lit up while the rest dims:
 * a CSS selector, or `text:Tạo người dùng` for the smallest visible button, link or heading whose text contains it.
 * A target that is not on the screen (yet) simply shows the step without the highlight.
 */
export type GuideStep = Readonly<{ title: string; text: string; target?: string }>;

type Box = Readonly<{ top: number; left: number; width: number; height: number }>;

const seenKey = (id: string) => `omts.guide.${id}.seen`;
const CHANGED = "omts-guide-changed";
const PAD = 6;
const CARD_WIDTH = 330;

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

const visible = (element: Element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };

function findTarget(target: string | undefined): HTMLElement | null {
  if (!target) return null;
  try {
    if (target.startsWith("text:")) {
      const wanted = target.slice(5).trim().toLowerCase();
      let best: HTMLElement | null = null;
      for (const element of document.querySelectorAll<HTMLElement>("button, a, h1, h2, h3, label, th, summary")) {
        const text = (element.textContent ?? "").trim().toLowerCase();
        if (text.includes(wanted) && visible(element) && (!best || text.length < (best.textContent ?? "").trim().length)) best = element;
      }
      return best;
    }
    const found = document.querySelector<HTMLElement>(target);
    return found && visible(found) ? found : null;
  } catch { return null; }
}

function measure(target: string | undefined): Box | null {
  const element = findTarget(target);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return { top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 };
}

/** The card sits under the lit part (or above it when there is no room), kept inside the window; with no target it stays at the bottom right. */
function cardPlace(box: Box | null): { top?: number; left?: number; bottom?: number; right?: number } {
  if (!box || typeof window === "undefined") return { bottom: 72, right: 16 };
  const width = Math.min(CARD_WIDTH, window.innerWidth - 32), height = 210;
  const left = Math.min(Math.max(16, box.left), window.innerWidth - width - 16);
  if (box.top + box.height + 12 + height < window.innerHeight) return { top: box.top + box.height + 12, left };
  if (box.top - 12 - height > 0) return { top: box.top - 12 - height, left };
  return { bottom: 72, right: 16 };
}

/**
 * "Hướng dẫn": a small labelled button fixed at the bottom right. It starts a short tour: one step at a time (Trước / Tiếp, dots for
 * the place in the tour), each step lighting up the part of the screen it explains. A dot on the button marks a guide not opened yet;
 * that is kept per screen `id` in this browser. Pure guidance: it never blocks or changes anything on the screen.
 */
export function ScreenGuide({ id, title = "Hướng dẫn", steps }: { id: string; title?: string; steps: readonly GuideStep[] }) {
  const seen = useSyncExternalStore(subscribe, () => wasSeen(id), () => true);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const target = steps[Math.min(index, Math.max(steps.length - 1, 0))]?.target;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const update = () => setBox(measure(target));
    const first = window.requestAnimationFrame(() => {
      findTarget(target)?.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "smooth" });
      update();
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.cancelAnimationFrame(first); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, target]);
  if (!steps.length) return null;
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const lit = open ? box : null;
  const show = () => { setIndex(0); setOpen(true); markSeen(id); };
  return <>
    {lit && <div aria-hidden data-guide-spotlight className="pointer-events-none fixed z-[39] rounded-lg ring-2 ring-primary transition-all duration-200"
      style={{ top: lit.top, left: lit.left, width: lit.width, height: lit.height, boxShadow: "0 0 0 9999px rgba(12, 28, 48, 0.55)" }} />}
    {open && <section role="dialog" aria-label={title} className="fixed z-[41] rounded-control border border-border bg-surface p-4 shadow-xl"
      style={{ width: `min(${CARD_WIDTH}px, calc(100vw - 32px))`, ...cardPlace(lit) }}>
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
      className="fixed bottom-4 right-4 z-40 flex h-10 items-center gap-2 rounded-full bg-primary pl-2 pr-4 text-sm font-semibold text-white shadow-lg hover:brightness-95 sm:bottom-6 sm:right-6">
      <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-white/20 text-sm">?</span>
      Hướng dẫn
      {!seen && <span aria-hidden className="size-2 rounded-full bg-amber-300" />}
    </button>
  </>;
}

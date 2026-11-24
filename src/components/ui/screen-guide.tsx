"use client";
import { useSyncExternalStore } from "react";

export type GuideStep = Readonly<{ title: string; text: string }>;

const storageKey = (id: string) => `omts.guide.${id}.dismissed`;
const CHANGED = "omts-guide-changed";

/** Storage can throw (private window, blocked site data); a guide that cannot remember simply shows again. */
/** Stored choice wins ("1" folded, "0" opened on purpose); with none, a phone-sized screen starts folded so the guide does not push the screen below the fold. */
function wasDismissed(id: string) {
  try {
    const stored = window.localStorage.getItem(storageKey(id));
    if (stored !== null) return stored === "1";
  } catch { /* fall through to the default */ }
  return window.innerWidth < 640;
}
function remember(id: string, dismissed: boolean) {
  try { window.localStorage.setItem(storageKey(id), dismissed ? "1" : "0"); } catch { /* not remembered */ }
  window.dispatchEvent(new Event(CHANGED));
}
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(CHANGED, onChange); window.removeEventListener("storage", onChange); };
}

/**
 * "Bắt đầu từ đây": a short numbered guide at the top of a screen. It shows open the first time, a click on "Ẩn hướng dẫn"
 * folds it to a one-line "Xem hướng dẫn" link that stays on the screen, and the choice is kept per screen `id` in this browser.
 * The server render and the first client render both show it open (no hydration mismatch); the stored choice applies right after.
 * Pure guidance: it never blocks or changes anything on the screen.
 */
export function ScreenGuide({ id, title = "Bắt đầu từ đây", steps }: { id: string; title?: string; steps: readonly GuideStep[] }) {
  const dismissed = useSyncExternalStore(subscribe, () => wasDismissed(id), () => false);
  if (dismissed) return <button type="button" className="mb-3 w-fit text-sm font-medium text-primary underline-offset-2 hover:underline" onClick={() => remember(id, false)}>Xem hướng dẫn</button>;
  return <section aria-label={title} className="mb-4 rounded-control border border-border bg-primary-soft p-4">
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <button type="button" className="text-sm text-text-muted underline-offset-2 hover:underline" onClick={() => remember(id, true)} aria-label="Ẩn hướng dẫn">Ẩn hướng dẫn ×</button>
    </div>
    <ol className="mt-2 grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => <li key={step.title} className="flex gap-3 text-sm">
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{index + 1}</span>
        <span><strong className="block">{step.title}</strong><span className="text-text-muted">{step.text}</span></span>
      </li>)}
    </ol>
  </section>;
}


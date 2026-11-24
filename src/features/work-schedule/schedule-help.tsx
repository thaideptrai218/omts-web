"use client";
import { useId, useState } from "react";

/** Local help belongs to this pop-up; no placeholder help destination. */
export function ScheduleHelp({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="mb-3 text-sm">
    <button type="button" aria-label="Hướng dẫn" aria-expanded={open} aria-controls={id}
      className="size-8 rounded-full border border-border font-semibold focus-visible:outline-2 focus-visible:outline-primary"
      onClick={() => setOpen(!open)}>?</button>
    {open && <p id={id} className="mt-2 rounded-control bg-surface-subtle p-3 text-text-muted">{children}</p>}
  </div>;
}

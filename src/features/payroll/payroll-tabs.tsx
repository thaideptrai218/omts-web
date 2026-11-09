"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import s from "./payroll-frame.module.css";

export type PayrollTab = Readonly<{ id: string; label: string; content: ReactNode }>;

/** Accessible tabs (WAI-ARIA tabs pattern): arrow keys, Home and End move between tabs. */
export function PayrollTabs({ label, tabs }: Readonly<{ label: string; tabs: readonly PayrollTab[] }>) {
  const base = useId();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(next: number) {
    const index = (next + tabs.length) % tabs.length;
    setActive(index);
    refs.current[index]?.focus();
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") move(active + 1);
    else if (event.key === "ArrowLeft") move(active - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(tabs.length - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div>
      <div className={s.tabs} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { refs.current[index] = element; }}
            id={`${base}-tab-${tab.id}`}
            type="button"
            role="tab"
            className={s.tab}
            aria-selected={index === active}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div key={tab.id} id={`${base}-panel-${tab.id}`} role="tabpanel" className={s.panel} aria-labelledby={`${base}-tab-${tab.id}`} hidden={index !== active} tabIndex={0}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}

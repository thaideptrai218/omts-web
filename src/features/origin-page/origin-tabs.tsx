"use client";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import s from "./origin-tabs.module.css";

type Tab = { id: string; label: string; content: ReactNode };

/** Hai thẻ của trang truy xuất (sản phẩm, hợp tác xã). Máy chủ render cả hai; mũi tên trái/phải chuyển thẻ. */
export function OriginTabs({ tabs, label }: { tabs: readonly Tab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const list = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setActive(tabs[next].id);
    list.current?.querySelectorAll("button")[next]?.focus();
  };
  return (
    <div className={s.tabs}>
      <div ref={list} role="tablist" aria-label={label} className={s.list} onKeyDown={move}>
        {tabs.map((tab) => (
          <button
            key={tab.id} type="button" role="tab" id={`tab-${tab.id}`} aria-controls={tab.id}
            aria-selected={tab.id === active} tabIndex={tab.id === active ? 0 : -1} className={s.tab} onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={tab.id} aria-labelledby={`tab-${tab.id}`} hidden={tab.id !== active} className={s.panel}>{tab.content}</div>
      ))}
    </div>
  );
}

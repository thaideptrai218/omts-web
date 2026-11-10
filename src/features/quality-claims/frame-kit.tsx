"use client";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import s from "./frame-kit.module.css";

/**
 * Khung giao diện dùng chung cho các màn chưa có nguồn dữ liệu (khiếu nại, trả hàng, hóa đơn bán).
 * Không gọi mạng, không giữ dữ liệu nghiệp vụ; mọi trạng thái ở đây chỉ là trạng thái nhập liệu cục bộ.
 */
export const EMPTY_TEXT = "Chưa có dữ liệu để hiển thị.";
export const NO_VALUE = "—";

export function FrameCard({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <section className={s.card} aria-labelledby={id}><h2 id={id} className={s.cardTitle}>{title}</h2>{children}</section>;
}

/** Bảng với tiêu đề cột thật và một dòng rỗng; `numeric` là chỉ số cột canh phải. */
export function FrameTable({ label, headings, numeric = [] }: { label: string; headings: readonly string[]; numeric?: readonly number[] }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table} aria-label={label}>
        <thead><tr>{headings.map((h, i) => <th key={`${h}-${i}`} scope="col" className={numeric.includes(i) ? s.num : undefined}>{h}</th>)}</tr></thead>
        <tbody><tr><td className={s.empty} colSpan={headings.length}>{EMPTY_TEXT}</td></tr></tbody>
      </table>
    </div>
  );
}

export function SummaryTiles({ label, items }: { label: string; items: readonly string[] }) {
  return <dl className={s.stats} aria-label={label}>{items.map((item) => <div key={item}><dt>{item}</dt><dd>{NO_VALUE}</dd></div>)}</dl>;
}

/** Cặp nhãn - giá trị (giá trị chưa có hiển thị "—"). */
export function KeyValues({ items }: { items: readonly string[] }) {
  return <dl className={s.kv}>{items.map((item) => <div key={item}><dt>{item}</dt><dd>{NO_VALUE}</dd></div>)}</dl>;
}

/** Nhóm ô chọn (checkbox hoặc radio) cho bộ lọc; chỉ giữ trạng thái cục bộ. */
export function OptionGroup({ legend, type, options, defaultChecked = [] }: { legend: string; type: "checkbox" | "radio"; options: readonly string[]; defaultChecked?: readonly string[] }) {
  const name = useId();
  return (
    <fieldset className={s.group}>
      <legend>{legend}</legend>
      {options.map((o) => <label key={o} className={s.option}><input type={type} name={type === "radio" ? name : undefined} defaultChecked={defaultChecked.includes(o)} />{o}</label>)}
    </fieldset>
  );
}

export type FrameTab = { id: string; label: string; content: ReactNode };

/** Tab truy cập được: mũi tên trái/phải đổi tab, tabpanel gắn nhãn theo tab đang chọn. */
export function FrameTabs({ label, tabs }: { label: string; tabs: readonly FrameTab[] }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const move = (event: KeyboardEvent, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className={s.tabs}>
        {tabs.map((t, i) => <button key={t.id} id={`${base}-tab-${i}`} type="button" role="tab" aria-selected={i === active} aria-controls={`${base}-panel`} tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)} onKeyDown={(e) => move(e, i)}>{t.label}</button>)}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${active}`}>{tabs[active]?.content}</div>
    </div>
  );
}

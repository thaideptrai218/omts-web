"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type DateRange } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { InterfaceIcon } from "../interface-icon";
import { FilterGroup } from "./management-layout";
import { fromQueryDate, presetValue, timePresetGroups, timePresetLabel, toDisplayDate, toQueryDate, type TimePreset, type TimeRangeValue } from "./time-range-model";
import screenStyles from "./management-screen.module.css";
import styles from "./time-range-filter.module.css";

const GAP = 4, SIDE_GAP = 12, MARGIN = 8;

/** Rendered on the body (or inside the open modal dialog, whose top layer makes everything outside it inert) so the filter rail's overflow cannot clip it. `side` (the filter rail) opens to the right, centred on its anchor with an arrow, and below it when there is no room. `below` drops
 * down under the anchor like a select: left edges aligned, or right edges when that would overflow, and above the anchor when there
 * is no room below. */
export function Popover({ anchor, label, onClose, children, placement = "side" }: { anchor: RefObject<HTMLElement | null>; label: string; onClose(returnFocus: boolean): void; children: ReactNode; placement?: "side" | "below" }) {
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; arrow?: number }>({ left: 0, top: 0 });
  useLayoutEffect(() => {
    const place = () => {
      const element = panel.current;
      if (!element || !anchor.current) return;
      const box = anchor.current.getBoundingClientRect(), { offsetWidth: width, offsetHeight: height } = element;
      // `left`/`top` are relative to the panel's containing block: the viewport on a page, but possibly an ancestor inside a
      // modal dialog. Measure where the current values actually land and correct by that offset.
      const shown = element.getBoundingClientRect();
      const originX = shown.left - (parseFloat(element.style.left) || 0), originY = shown.top - (parseFloat(element.style.top) || 0);
      const set = (left: number, top: number, arrow?: number) => setPosition(previous => previous.left === left - originX && previous.top === top - originY && previous.arrow === arrow ? previous : { left: left - originX, top: top - originY, arrow });
      if (placement === "side" && box.right + SIDE_GAP + width <= window.innerWidth - MARGIN) {
        const centre = box.top + box.height / 2;
        const sideTop = Math.max(MARGIN, Math.min(centre - height / 2, window.innerHeight - height - MARGIN));
        set(box.right + SIDE_GAP, sideTop, centre - sideTop);
        return;
      }
      const preferred = placement === "below" && box.left + width > window.innerWidth - MARGIN ? box.right - width : box.left;
      const left = Math.max(MARGIN, Math.min(preferred, window.innerWidth - width - MARGIN));
      const below = box.bottom + GAP;
      const top = below + height <= window.innerHeight - MARGIN ? below : Math.max(MARGIN, Math.min(box.top - height - GAP, window.innerHeight - height - MARGIN));
      set(left, top);
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(place);
    if (panel.current) observer?.observe(panel.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { observer?.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor, placement]);
  useEffect(() => { if (!panel.current?.contains(document.activeElement)) panel.current?.focus(); }, []);
  useEffect(() => {
    const pointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchor.current?.contains(target) && !(target instanceof Element && target.closest(".omts-select-menu"))) onClose(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        // A month/year/time list is a separate top-layer popover. Its own document listener
        // handles this first Escape; keep the calendar open until the next one.
        if (panel.current?.querySelector(".omts-select-trigger[data-open]")) return;
        onClose(true);
        return;
      }
      const element = panel.current;
      if (event.key !== "Tab" || !element?.contains(document.activeElement)) return;
      const items = [...element.querySelectorAll<HTMLElement>("button:not([disabled]):not([tabindex='-1']), select:not([disabled]), input:not([disabled])")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === first || active === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", keyboard); };
  }, [anchor, onClose]);
  // Native popovers escape clipping; keeping the dialog parent preserves modal interactivity.
  function showInTopLayer(element: HTMLDivElement | null) {
    panel.current = element;
    if (element && typeof element.showPopover === "function") {
      try { if (!element.matches(":popover-open")) element.showPopover(); } catch { /* Fixed-position fallback for older browsers. */ }
    }
  }
  return createPortal(<div ref={showInTopLayer} popover="manual" role="dialog" aria-label={label} tabIndex={-1} className={`${screenStyles.theme} ${styles.popover}`} data-side={position.arrow === undefined ? undefined : "right"} style={{ left: position.left, top: position.top, "--arrow-top": `${position.arrow ?? 0}px` } as CSSProperties}><div className={styles.popoverBody}>{children}</div></div>, anchor.current?.closest("dialog") ?? document.body);
}

const monthOf = (date: Date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1);

function CustomCalendar({ value, onApply, onCancel }: { value: TimeRangeValue; onApply(from: string, to: string): void; onCancel(): void }) {
  const initial = value.kind === "custom" ? { from: fromQueryDate(value.from), to: fromQueryDate(value.to) } : undefined;
  const [draft, setDraft] = useState<DateRange | undefined>(initial);
  const [editing, setEditing] = useState<"from" | "to">("from");
  const [hovered, setHovered] = useState<Date>();
  const firstMonth = monthOf(initial?.from ?? new Date());
  const [leftMonth, setLeftMonth] = useState(firstMonth);
  const [rightMonth, setRightMonth] = useState(() => (initial?.to && monthOf(initial.to) > firstMonth ? monthOf(initial.to) : monthOf(firstMonth, 1)));
  const [singleMonth] = useState(() => window.innerWidth < 640);
  const shown = (date?: Date) => (date ? toDisplayDate(toQueryDate(date)) : "dd/mm/yyyy");
  // One rule for what a click would do, so hovering a day previews exactly the outcome of clicking it.
  const afterClick = (day: Date): { range: DateRange; editing: "from" | "to" } => {
    if (editing === "from") return { range: { from: day, to: draft?.to && draft.to >= day ? draft.to : undefined }, editing: "to" };
    return draft?.from && day >= draft.from ? { range: { from: draft.from, to: day }, editing: "from" } : { range: { from: day, to: undefined }, editing: "to" };
  };
  const preview = hovered ? afterClick(hovered).range : undefined;
  const line = preview ?? draft;
  const pick = (_: DateRange | undefined, clicked: Date) => { const next = afterClick(clicked); setDraft(next.range); setEditing(next.editing); };
  function today() { const now = new Date(), day = new Date(now.getFullYear(), now.getMonth(), now.getDate()); setDraft({ from: day, to: day }); setEditing("from"); setLeftMonth(monthOf(day)); setRightMonth(monthOf(day, 1)); }
  const calendar = (month: Date, onMonthChange: (next: Date) => void) => <DayPicker mode="range" navLayout="around" locale={vi} weekStartsOn={1} month={month} onMonthChange={onMonthChange} selected={draft} onSelect={pick} fixedWeeks formatters={{ formatWeekdayName: day => ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][day.getDay()] }}
    onDayMouseEnter={(day) => setHovered(day)} modifiers={{ preview: preview?.from ? { from: preview.from, to: preview.to ?? preview.from } : false }} modifiersClassNames={{ preview: styles.preview }} />;
  return <div className={styles.calendar}>
    <p className={styles.rangeLine} aria-live="polite">
      <button type="button" className={styles.endChip} aria-pressed={editing === "from"} onClick={() => setEditing("from")}>Từ ngày: <strong>{shown(line?.from)}</strong></button>
      <button type="button" className={styles.endChip} aria-pressed={editing === "to"} onClick={() => setEditing("to")}>Đến ngày: <strong>{shown(line?.to)}</strong></button>
    </p>
    <div className={styles.months} onMouseLeave={() => setHovered(undefined)}>{calendar(leftMonth, setLeftMonth)}{!singleMonth && calendar(rightMonth, setRightMonth)}</div>
    <footer className={styles.calendarFooter}>
      <button type="button" className={screenStyles.linkButton} onClick={today}>Hôm nay</button>
      <div>
        <button type="button" className={styles.secondary} onClick={onCancel}>Bỏ qua</button>
        <button type="button" className={styles.primary} disabled={!draft?.from} onClick={() => draft?.from && onApply(toQueryDate(draft.from), toQueryDate(draft.to ?? draft.from))}>Áp dụng</button>
      </div>
    </footer>
  </div>;
}

/** The reusable time filter: one radio row for quick presets, one for a custom two-month range. */
export function TimeRangeFilter({ legend, value, onChange }: { legend: string; value: TimeRangeValue; onChange(value: TimeRangeValue): void }) {
  const name = useId();
  const presetButton = useRef<HTMLButtonElement>(null), customButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<"preset" | "custom">();
  const [lastPreset, setLastPreset] = useState<TimePreset>(value.kind === "preset" ? value.preset : "all");
  const activePreset = value.kind === "preset" ? value.preset : lastPreset;
  const close = (returnFocus: boolean) => {
    if (returnFocus) (open === "custom" ? customButton : presetButton).current?.focus();
    setOpen(undefined);
  };
  const applyPreset = (preset: TimePreset) => { setLastPreset(preset); onChange(presetValue(preset)); };
  const customLabel = value.kind === "custom" ? `${toDisplayDate(value.from)} - ${toDisplayDate(value.to)}` : "Tùy chỉnh";
  return <FilterGroup legend={legend}>
    <div className={styles.row}>
      <input type="radio" name={name} aria-label="Theo mốc thời gian" checked={value.kind === "preset"} onChange={() => applyPreset(activePreset)} />
      <button ref={presetButton} type="button" className={styles.input} aria-haspopup="dialog" aria-expanded={open === "preset"} aria-label={`Mốc thời gian: ${timePresetLabel(activePreset)}`} onClick={() => setOpen(open === "preset" ? undefined : "preset")}>
        <span>{timePresetLabel(activePreset)}</span><InterfaceIcon name="chevron-right" />
      </button>
    </div>
    <div className={styles.row}>
      <input type="radio" name={name} aria-label="Khoảng thời gian tùy chỉnh" checked={value.kind === "custom"} onChange={() => setOpen("custom")} />
      <button ref={customButton} type="button" className={styles.input} aria-haspopup="dialog" aria-expanded={open === "custom"} aria-label={`Tùy chỉnh: ${customLabel}`} onClick={() => setOpen(open === "custom" ? undefined : "custom")}>
        <span>{customLabel}</span><InterfaceIcon name="calendar" />
      </button>
    </div>
    {open === "preset" && <Popover anchor={presetButton} label={`${legend}: chọn mốc`} onClose={close}>
      <div className={styles.presets}>{timePresetGroups.map((group) => <section key={group.label}>
        <h4>{group.label}</h4>
        {group.presets.map(([preset, label]) => <button key={preset} type="button" className={styles.preset} aria-pressed={value.kind === "preset" && value.preset === preset} onClick={() => { applyPreset(preset); close(true); }}>{label}</button>)}
      </section>)}</div>
    </Popover>}
    {open === "custom" && <Popover anchor={customButton} label={`${legend}: tùy chỉnh`} onClose={close}>
      <CustomCalendar value={value} onCancel={() => close(true)} onApply={(from, to) => { onChange({ kind: "custom", from, to }); close(true); }} />
    </Popover>}
  </FilterGroup>;
}

"use client";
import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { vietnameseValidationMessage } from "@/components/form/vietnamese-validation-messages";

type Option = { value: string; label: string; disabled: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** The <option>s of the children, also inside fragments, arrays and <optgroup>s. */
function optionsOf(children: ReactNode): Option[] {
  const found: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode; disabled?: boolean; hidden?: boolean }>(child)) return;
    if (child.type === "option") {
      if (child.props.hidden) return;
      const label = textOf(child.props.children);
      found.push({ value: child.props.value === undefined ? label : String(child.props.value), label, disabled: !!child.props.disabled });
    } else found.push(...optionsOf(child.props.children));
  });
  return found;
}

/** Lower case without diacritics, so that "can tho" finds "Cần Thơ" and "dak lak" finds "Đắk Lắk". */
const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/** A list with more choices than this gets a search box unless the box says otherwise. */
const SEARCH_FROM = 5;

const setNativeValue = Object.getOwnPropertyDescriptor(typeof HTMLSelectElement === "undefined" ? Object : HTMLSelectElement.prototype, "value")?.set;

/**
 * Drop-in replacement for `<select>` with the same props and `<option>` children. A visually hidden native select keeps
 * keyboard use, screen readers, forms and tests working; the visible button opens a styled list (fixed to the viewport and rendered on `body`,
 * or inside the modal dialog the box sits in, so scrolling lists never clip it and a dialog never hides it). Picking an item sets the native select and fires its real change
 * event, so `onChange={(event) => event.target.value}` handlers work unchanged.
 */
export function SelectBox({ className = "", children, style, ref, onChange, onInvalid, searchable: searchableProp, searchLabel = "Tìm trong danh sách", leading, ...props }: ComponentProps<"select"> & {
  /** Puts a search box on top of the list that filters the items by their text, ignoring case and diacritics. Left out, a list of more than 5 choices has one; `false` never shows it. */
  searchable?: boolean; searchLabel?: string;
  /** A small icon shown before the value in the box (e.g. a map pin for an address). */
  leading?: ReactNode;
}) {
  const native = useRef<HTMLSelectElement | null>(null), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const options = optionsOf(children);
  const [uncontrolled, setUncontrolled] = useState(() => String(props.defaultValue ?? options[0]?.value ?? ""));
  const current = props.value !== undefined ? String(props.value) : uncontrolled;
  const shown = options.find((option) => option.value === current) ?? (props.value === undefined ? options[0] : undefined);
  const [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const searchable = searchableProp ?? options.filter((option) => option.value !== "").length > SEARCH_FROM;
  // The native select is pinned to the viewport corner, so its own validation bubble would appear far from the field.
  // A failed submit instead shows the message under the box; it stays only while the value is still the one that failed.
  const errorId = useId();
  const [failed, setFailed] = useState<{ value: string; text: string }>();
  const errorText = failed && failed.value === current ? failed.text : undefined;
  const [open, setOpen] = useState(false), [box, setBox] = useState<{ left: number; top: number; width: number; up: boolean; host: HTMLElement }>();

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    // A modal <dialog> sits in the top layer, above everything on `body`: inside one the list must be a child of that dialog or it opens out of sight.
    const host = trigger.current.closest("dialog") ?? document.body;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect(), below = window.innerHeight - rect.bottom, up = below < 240 && rect.top > below;
      setBox({ left: rect.left, top: up ? rect.top : rect.bottom, width: Math.max(rect.width, 160), up, host });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!list.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); native.current?.focus(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  // Open on the chosen item (centred), not at the top of a long list such as years. The list exists only after the box is placed.
  const placed = !!box;
  useLayoutEffect(() => {
    const menu = list.current, chosen = menu?.querySelector<HTMLElement>("[data-selected]");
    if (!open || !placed || !menu || !chosen) return;
    menu.scrollTop += chosen.getBoundingClientRect().top - menu.getBoundingClientRect().top - (menu.clientHeight - chosen.offsetHeight) / 2;
  }, [open, placed]);

  // The list is a popover in the top layer: placed against the viewport, above a modal dialog, and never clipped by the
  // dialog's scrolling box or shifted by its open animation's transform. Inside a dialog it stays in the dialog's subtree,
  // so the modal does not make it inert.
  function showInTopLayer(element: HTMLUListElement | null) {
    list.current = element;
    if (element && !element.matches(":popover-open")) { try { element.showPopover(); } catch { /* no popover support: stays a fixed element */ } }
  }

  const needle = fold(query.trim());
  // A searchable list leaves out its empty "Chọn …" placeholder while a field must be filled; where it may stay empty ("Tất cả vùng") the empty choice stays, until the user types.
  const shownOptions = searchable ? options.filter((option) => option.value === "" ? !props.required && !needle : !needle || fold(option.label).includes(needle)) : options;
  const enabled = shownOptions.filter((option) => !option.disabled);
  const activeValue = enabled[Math.min(active, enabled.length - 1)]?.value;

  function pick(value: string) {
    setOpen(false); setQuery("");
    const select = native.current;
    if (!select || value === select.value) return;
    setNativeValue?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.focus();
  }

  return <span className="omts-select">
    <select
      {...props}
      ref={(element) => { native.current = element; if (typeof ref === "function") ref(element); else if (ref) ref.current = element; }}
      className="omts-select-native"
      tabIndex={props.tabIndex}
      aria-invalid={errorText ? true : props["aria-invalid"]}
      aria-describedby={[props["aria-describedby"], errorText ? errorId : ""].filter(Boolean).join(" ") || undefined}
      onChange={(event) => { setUncontrolled(event.target.value); onChange?.(event); }}
      onInvalid={(event) => {
        const field = event.currentTarget;
        event.preventDefault();
        setFailed({ value: field.value, text: vietnameseValidationMessage(field) || field.validationMessage });
        // preventDefault also drops the browser's own focus on the first invalid control, so do it here.
        const firstInvalid = field.form && Array.from(field.form.elements).find((element) => element instanceof HTMLElement && "validity" in element && (element as HTMLInputElement).willValidate && !(element as HTMLInputElement).validity.valid);
        if (firstInvalid === field) { trigger.current?.scrollIntoView?.({ block: "center" }); field.focus(); }
        onInvalid?.(event);
      }}
    >{children}</select>
    <button ref={trigger} type="button" tabIndex={-1} aria-hidden="true" disabled={props.disabled} className={`omts-select-trigger ${className}`} style={errorText ? { ...style, borderColor: "var(--omts-color-danger, #dc2626)" } : style} onClick={() => { setQuery(""); setActive(0); setOpen((value) => !value); }} data-open={open || undefined} title={props.title}>
      {leading && <span className="omts-select-lead" aria-hidden="true">{leading}</span>}
      <span className="omts-select-value" data-placeholder={!shown?.value || undefined}>{shown?.label ?? ""}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {errorText && <span id={errorId} role="alert" className="block text-xs leading-5 text-danger">{errorText}</span>}
    {open && box && createPortal(<ul ref={showInTopLayer} popover="manual" aria-hidden={searchable ? undefined : true} className="omts-select-menu" data-up={box.up || undefined}
      style={{ left: box.left, width: box.width, ...(box.up ? { top: box.top - 4, translate: "0 -100%" } : { top: box.top + 4 }) }}>
      {searchable && <li className="omts-select-search">
        <svg className="omts-select-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input autoFocus type="search" aria-label={searchLabel} placeholder={`${searchLabel}…`} autoComplete="off" value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, Math.min(enabled.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
            else if (event.key === "Enter") { event.preventDefault(); const chosen = enabled[Math.min(active, enabled.length - 1)]; if (chosen) pick(chosen.value); }
          }} />
      </li>}
      {searchable && needle && !shownOptions.length && <li className="omts-select-empty" role="status">Không tìm thấy “{query.trim()}”.</li>}
      {searchable && needle && shownOptions.length > 0 && <li className="omts-select-count">{shownOptions.length} kết quả</li>}
      {shownOptions.map((option) => <li key={option.value}>
        <button type="button" tabIndex={-1} disabled={option.disabled} data-selected={option.value === current || undefined} data-active={searchable && option.value === activeValue || undefined} onClick={() => pick(option.value)}>
          <span>{option.label}</span>
          {option.value === current && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
        </button>
      </li>)}
    </ul>, box.host)}
  </span>;
}

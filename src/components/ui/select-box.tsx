"use client";
import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";

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

const setNativeValue = Object.getOwnPropertyDescriptor(typeof HTMLSelectElement === "undefined" ? Object : HTMLSelectElement.prototype, "value")?.set;

/**
 * Drop-in replacement for `<select>` with the same props and `<option>` children. A visually hidden native select keeps
 * keyboard use, screen readers, forms and tests working; the visible button opens a styled list (rendered on `body`,
 * so dialogs and scrolling lists never clip it). Picking an item sets the native select and fires its real change
 * event, so `onChange={(event) => event.target.value}` handlers work unchanged.
 */
export function SelectBox({ className = "", children, style, ref, onChange, ...props }: ComponentProps<"select">) {
  const native = useRef<HTMLSelectElement | null>(null), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const options = optionsOf(children);
  const [uncontrolled, setUncontrolled] = useState(() => String(props.defaultValue ?? options[0]?.value ?? ""));
  const current = props.value !== undefined ? String(props.value) : uncontrolled;
  const shown = options.find((option) => option.value === current) ?? (props.value === undefined ? options[0] : undefined);
  const [open, setOpen] = useState(false), [box, setBox] = useState<{ left: number; top: number; width: number; up: boolean }>();

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect(), below = window.innerHeight - rect.bottom;
      setBox({ left: rect.left, top: below < 240 && rect.top > below ? rect.top : rect.bottom, width: Math.max(rect.width, 160), up: below < 240 && rect.top > below });
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
    list.current?.querySelector<HTMLElement>("[data-selected]")?.scrollIntoView({ block: "nearest" });
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  function pick(value: string) {
    setOpen(false);
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
      onChange={(event) => { setUncontrolled(event.target.value); onChange?.(event); }}
    >{children}</select>
    <button ref={trigger} type="button" tabIndex={-1} aria-hidden="true" disabled={props.disabled} className={`omts-select-trigger ${className}`} style={style} onClick={() => setOpen((value) => !value)} data-open={open || undefined} title={props.title}>
      <span className="omts-select-value" data-placeholder={!shown?.value || undefined}>{shown?.label ?? ""}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && box && createPortal(<ul ref={list} aria-hidden="true" className="omts-select-menu" data-up={box.up || undefined}
      style={{ left: box.left, width: box.width, ...(box.up ? { bottom: window.innerHeight - box.top + 4 } : { top: box.top + 4 }) }}>
      {options.map((option) => <li key={option.value}>
        <button type="button" tabIndex={-1} disabled={option.disabled} data-selected={option.value === current || undefined} onClick={() => pick(option.value)}>
          <span>{option.label}</span>
          {option.value === current && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
        </button>
      </li>)}
    </ul>, document.body)}
  </span>;
}

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
 * keyboard use, screen readers, forms and tests working; the visible button opens a styled list (fixed to the viewport and rendered on `body`,
 * or inside the modal dialog the box sits in, so scrolling lists never clip it and a dialog never hides it). Picking an item sets the native select and fires its real change
 * event, so `onChange={(event) => event.target.value}` handlers work unchanged.
 */
export function SelectBox({ className = "", children, style, ref, onChange, ...props }: ComponentProps<"select">) {
  const native = useRef<HTMLSelectElement | null>(null), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const options = optionsOf(children);
  const [uncontrolled, setUncontrolled] = useState(() => String(props.defaultValue ?? options[0]?.value ?? ""));
  const current = props.value !== undefined ? String(props.value) : uncontrolled;
  const shown = options.find((option) => option.value === current) ?? (props.value === undefined ? options[0] : undefined);
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
    list.current?.querySelector<HTMLElement>("[data-selected]")?.scrollIntoView({ block: "nearest" });
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  // The list is a popover in the top layer: placed against the viewport, above a modal dialog, and never clipped by the
  // dialog's scrolling box or shifted by its open animation's transform. Inside a dialog it stays in the dialog's subtree,
  // so the modal does not make it inert.
  function showInTopLayer(element: HTMLUListElement | null) {
    list.current = element;
    if (element && !element.matches(":popover-open")) { try { element.showPopover(); } catch { /* no popover support: stays a fixed element */ } }
  }

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
    {open && box && createPortal(<ul ref={showInTopLayer} popover="manual" aria-hidden="true" className="omts-select-menu" data-up={box.up || undefined}
      style={{ left: box.left, width: box.width, ...(box.up ? { top: box.top - 4, translate: "0 -100%" } : { top: box.top + 4 }) }}>
      {options.map((option) => <li key={option.value}>
        <button type="button" tabIndex={-1} disabled={option.disabled} data-selected={option.value === current || undefined} onClick={() => pick(option.value)}>
          <span>{option.label}</span>
          {option.value === current && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
        </button>
      </li>)}
    </ul>, box.host)}
  </span>;
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { InterfaceIcon } from "../interface-icon";
import { foldVietnamese as foldText } from "@/shared/presentation/fold-text";
import styles from "./pickers.module.css";

export type PersonOption = { id: string; name: string };

/** Pick one person from a list with a search box (accent-insensitive); keyboard: arrows move, Enter picks, Escape closes. */
export function PersonPicker({ label, people, value, placeholder = "Chọn người", disabled, onChange }: { label: string; people: readonly PersonOption[]; value: string; placeholder?: string; disabled?: boolean; onChange(id: string): void }) {
  const [open, setOpen] = useState(false), [term, setTerm] = useState(""), [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  const chosen = people.find((person) => person.id === value);
  const matches = useMemo(() => { const key = foldText(term.trim()); return people.filter((person) => !key || foldText(person.name).includes(key)); }, [people, term]);
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (id: string) => { onChange(id); setOpen(false); setTerm(""); };
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  return <div ref={root} className={styles.person}>
    <button type="button" className={styles.personTrigger} aria-label={`${label}: ${chosen?.name ?? "chưa chọn"}`} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => { setOpen((current) => !current); setActive(0); }}>
      <InterfaceIcon name="user" /><span>{chosen?.name ?? placeholder}</span><InterfaceIcon name="chevron-down" />
    </button>
    {open && <div className={styles.personPanel} onKeyDown={(event) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(matches.length - 1, index + 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
      if (event.key === "Enter" && matches[active]) { event.preventDefault(); pick(matches[active].id); }
    }}>
      <div className={styles.personSearch}><InterfaceIcon name="search" /><input ref={search} type="search" aria-label={`Tìm ${label.toLowerCase()}`} placeholder="Tìm theo tên" value={term} onChange={(event) => { setTerm(event.target.value); setActive(0); }} /></div>
      <ul role="listbox" aria-label={label}>{matches.map((person, index) => <li key={person.id} role="option" aria-selected={person.id === value} data-active={index === active || undefined} onMouseEnter={() => setActive(index)} onClick={() => pick(person.id)}>
        <span className={styles.personAvatar}>{initials(person.name)}</span><span>{person.name}</span>{person.id === value && <InterfaceIcon name="check" />}
      </li>)}{!matches.length && <li className={styles.personEmpty}>Không tìm thấy người phù hợp.</li>}</ul>
    </div>}
  </div>;
}

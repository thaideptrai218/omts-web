"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./top-shell.module.css";
/** `columns`: the children are `NavigationSection`s laid out side by side (one list on narrow screens). */
export function NavigationGroup({label,columns=false,children}:{label:string;compact?:boolean;columns?:boolean;children:ReactNode}) {
 const ref=useRef<HTMLDetailsElement>(null);const pathname=usePathname();
 useEffect(()=>{ref.current?.removeAttribute("open");},[pathname]);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))ref.current?.removeAttribute("open");};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close);},[]);
 return <details ref={ref} className={styles.group} onKeyDown={e=>{if(e.key==="Escape"){ref.current?.removeAttribute("open");ref.current?.querySelector("summary")?.focus();}}}><summary>{label}<svg aria-hidden="true" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7"/></svg></summary><div className={columns?`${styles.dropdown} ${styles.dropdownColumns}`:styles.dropdown} onClick={e=>{if((e.target as HTMLElement).closest("a"))ref.current?.removeAttribute("open");}}>{children}</div></details>;
}
/** One titled column of a `columns` group. */
export function NavigationSection({title,children}:{title:string;children:ReactNode}) {
 return <section className={styles.dropdownSection} aria-label={title}><h3 className={styles.dropdownSectionTitle}>{title}</h3><div className={styles.dropdownSectionItems}>{children}</div></section>;
}

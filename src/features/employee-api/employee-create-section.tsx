"use client";
import type { ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./employee-create-form.module.css";

/**
 * A collapsible group. The body stays mounted (only hidden) so typed values and
 * focus lookups survive collapsing; a group holding an error shows an "Có lỗi" badge.
 */
export function EmployeeCreateSection({ id, title, open, hasError, disabled, onToggle, children }: {
  id: string; title: string; open: boolean; hasError: boolean; disabled: boolean; onToggle(): void; children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      <h3 className={styles.heading}>
        <button type="button" id={`${id}-toggle`} className={styles.toggle} aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          <InterfaceIcon name={open ? "chevron-up" : "chevron-down"} className={styles.chevron} />
          <span>{title}</span>
          {hasError && <span className={styles.badge}>Có lỗi</span>}
        </button>
      </h3>
      <fieldset id={`${id}-body`} className={styles.body} hidden={!open} disabled={disabled} aria-labelledby={`${id}-toggle`}>
        {children}
      </fieldset>
    </section>
  );
}

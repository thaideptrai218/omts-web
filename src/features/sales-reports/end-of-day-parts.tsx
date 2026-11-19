"use client";
import { useId, useState, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./end-of-day-report.module.css";

type SectionProps = Readonly<{ title: string; summary: string; children: ReactNode }>;

/** Khối báo cáo thu gọn được (mặc định mở): tiêu đề kèm dòng tóm tắt, bấm để thu/mở. */
export function EndOfDaySection({ title, summary, children }: SectionProps) {
  const [open, setOpen] = useState(true), bodyId = useId();
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>
        <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((value) => !value)}>
          <InterfaceIcon name={open ? "chevron-down" : "chevron-right"} className="size-4" />
          <span>{title}</span><small>{summary}</small>
        </button>
      </h2>
      <div id={bodyId} className={styles.sectionBody} hidden={!open}>{children}</div>
    </section>
  );
}

/** Dòng chữ nhỏ cho danh sách rỗng trong một khối. */
export function EmptyNote({ children }: Readonly<{ children: ReactNode }>) {
  return <p className={styles.empty}>{children}</p>;
}

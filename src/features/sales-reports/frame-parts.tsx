import { useId, type ReactNode } from "react";
import s from "./report-frame.module.css";

/**
 * FRAME ONLY shared parts: layout building blocks with no data source.
 * Used by the report screens and the payroll screens. They never fetch.
 */
export const FRAME_EMPTY_TEXT = "Chưa có dữ liệu để hiển thị.";

export type HeadingGroup = Readonly<{ label: string; span: number }>;

type FrameTableProps = Readonly<{
  /** Visually hidden table caption (accessible name of the scroll region). */
  caption: string;
  /** Leaf column headings. */
  headings: readonly string[];
  /** Zero-based indexes of right-aligned (numeric) columns. */
  rightAligned?: readonly number[];
  /** Optional spanning headings above the columns starting at `groupStart`. */
  groups?: readonly HeadingGroup[];
  groupStart?: number;
}>;

/** Table with real column headings and a single empty-state row. */
export function FrameTable({ caption, headings, rightAligned = [], groups, groupStart = 0 }: FrameTableProps) {
  const align = (index: number) => (rightAligned.includes(index) ? s.right : undefined);
  const leafHeadings = groups ? headings.slice(groupStart) : headings;
  return (
    <div className={s.tableFrame} role="region" aria-label={caption} tabIndex={0}>
      <table className={s.table}>
        <caption className={s.srOnly}>{caption}</caption>
        <thead>
          {groups ? (
            <>
              <tr>
                {headings.slice(0, groupStart).map((heading, index) => <th key={heading} scope="col" rowSpan={2} className={align(index)}>{heading}</th>)}
                {groups.map((group) => <th key={group.label} scope="colgroup" colSpan={group.span} className={s.groupHead}>{group.label}</th>)}
              </tr>
              <tr>{leafHeadings.map((heading, index) => <th key={`${heading}-${index}`} scope="col" className={align(index + groupStart)}>{heading}</th>)}</tr>
            </>
          ) : (
            <tr>{headings.map((heading, index) => <th key={`${heading}-${index}`} scope="col" className={align(index)}>{heading}</th>)}</tr>
          )}
        </thead>
        <tbody>
          <tr><td colSpan={headings.length} className={s.emptyCell}>{FRAME_EMPTY_TEXT}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

/** Summary tiles: every value is "—" because no data is loaded. */
export function FrameTiles({ labels, label }: Readonly<{ labels: readonly string[]; label: string }>) {
  return (
    <dl className={s.tiles} aria-label={label}>
      {labels.map((item) => <div key={item}><dt>{item}</dt><dd>—</dd></div>)}
    </dl>
  );
}

/** Titled block (h2) used for tables and cards below the screen heading. */
export function FrameSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  const id = useId();
  return <section className={s.section} aria-labelledby={id}><h2 id={id}>{title}</h2>{children}</section>;
}

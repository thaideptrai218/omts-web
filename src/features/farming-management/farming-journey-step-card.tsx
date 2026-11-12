import Link from "next/link";
import styles from "@/components/layout/top-shell.module.css";
import type { StripItem, StripMark } from "@/features/cycles-api/cycle-journey-strip-model";

const markStyle: Record<StripMark, string | undefined> = { done: styles.markDone, active: styles.markActive, todo: styles.markTodo, neutral: undefined };
/** Shape, not only colour, tells the states apart: tick, dot in a ring, empty ring. */
const markGlyph: Record<StripMark, string> = { done: "✓", active: "●", todo: "", neutral: "" };

/**
 * One step of the journey bar when a cycle is in context: number, name, state mark, a one-line figure and a thin plan bar.
 * `item` undefined = the figures are still loading (skeleton keeps the card height); the step has no figure (water) = title only.
 */
export function JourneyStepCard({ href, index, title, caption, current, item, loading }: { href: string; index: number; title: string; caption?: string; current: boolean; item?: StripItem; loading: boolean }) {
  const showMark = item && item.mark !== "neutral";
  return <li className={styles.stepItem}>
    <Link href={href} aria-current={current ? "page" : undefined} className={styles.stepCard} title={[caption, item?.figure].filter(Boolean).join(". ") || undefined}>
      <span className={styles.stepHead}>
        <span aria-hidden="true" className={styles.journeyNumber}>{index}</span>
        <span className={styles.stepTitle}>{title}</span>
        {showMark && <><span aria-hidden="true" className={`${styles.stepMark} ${markStyle[item.mark]}`}>{markGlyph[item.mark]}</span><span className="sr-only">{item.markLabel}.</span></>}
      </span>
      {caption && <span className={styles.stepCaption}>{caption}</span>}
      <span className={styles.stepFigure}>{loading ? <span className={`omts-skeleton ${styles.stepSkeleton}`} role="status" aria-label="Đang tải tiến độ" /> : item?.figure}</span>
      {item?.percent !== undefined && <>
        <span aria-hidden="true" className={styles.stepBar}><span className={`${styles.stepBarFill} ${item.over ? styles.stepBarOver : ""}`} style={{ width: `${Math.min(100, item.percent)}%` }} /></span>
        <span className="sr-only">{`Đạt ${item.percent.toLocaleString("vi-VN")}% kế hoạch.`}</span>
      </>}
    </Link>
  </li>;
}

"use client";
import { Button } from "@/components/ui/button";
import styles from "@/features/farming-management/farming-management.module.css";

/**
 * Shown after a save whose outcome is unknown: nothing is sent again until the user has re-read the current record
 * (`onReload`) and confirmed (`onReviewed`, offered only once the reload finished and the write is no longer pending).
 */
export function WaterReviewNotice({ text, reloadLabel, reloaded, busy, canContinue, onReload, onReviewed, reviewedLabel }: {
  text: string; reloadLabel: string; reloaded: boolean; busy: boolean; canContinue: boolean; onReload(): void; onReviewed(): void; reviewedLabel: string;
}) {
  return <div role="alert" className={styles.alert}><p>{text}</p><div>
    <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={onReload}>{reloadLabel}</Button>
    {reloaded && !busy && canContinue && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={onReviewed}>{reviewedLabel}</Button>}
  </div></div>;
}

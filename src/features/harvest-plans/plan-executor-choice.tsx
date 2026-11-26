"use client";
import { useId } from "react";
import type { PlanExecutor } from "./contracts";
import styles from "./plans.module.css";

const options: readonly { value: PlanExecutor; title: string; detail: string }[] = [
  { value: "ZoneManager", title: "Giao quản lý vùng", detail: "Quản lý vùng nhận, thu hoạch rồi bàn giao cho chủ." },
  { value: "Owner", title: "Chủ tự làm", detail: "Chủ ghi thu hoạch và hoàn thành, không qua quản lý vùng." },
];

/** "Người thực hiện" of a plan being assigned: the zone manager (default) or the Owner himself. It cannot be changed once the plan is assigned. */
export function PlanExecutorChoice({ value, onChange, disabled }: { value: PlanExecutor; onChange(next: PlanExecutor): void; disabled?: boolean }) {
  const name = useId();
  return <fieldset className={styles.executorGroup} disabled={disabled}>
    <legend>Người thực hiện</legend>
    {options.map((option) => <label key={option.value} className={styles.executorCard}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
      <div><strong>{option.title}</strong><span>{option.detail}</span></div>
    </label>)}
  </fieldset>;
}

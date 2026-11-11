"use client";
import type { Dispatch, SetStateAction } from "react";
import { Field, Note } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import type { RaftDraft, RaftField } from "./raft-model";

const labels: readonly (readonly [RaftField, string, boolean])[] = [["code", "Mã bè", true], ["size", "Kích thước", true], ["laneCount", "Số làn đang dùng", true], ["location", "Vị trí", false],
  ["latitude", "Vĩ độ", true], ["longitude", "Kinh độ", true], ["conditionNotes", "Tình trạng bè", false]];
/** One input per raft field, in the same order and grid as the read-only facts. `only` limits the fields of a collapsible group. */
export function RaftFormFields({ draft, setDraft, errors, only }: {
  draft: RaftDraft; setDraft: Dispatch<SetStateAction<RaftDraft>>; errors: Partial<Record<RaftField, string>>; only?: readonly RaftField[];
}) {
  return <div className={styles.fields}>{labels.filter(([key]) => !only || only.includes(key)).map(([key, label, required]) => {
    const common = { name: key, value: draft[key], "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `raft-error-${key}` : undefined,
      onChange: (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value })) };
    return <div key={key}>
      {key === "conditionNotes" ? <Note label={label} maxLength={1000} {...common} />
        : <Field label={required ? `${label} *` : label} required={required} maxLength={key === "location" || key === "size" ? 300 : 100} inputMode={key === "latitude" || key === "longitude" ? "decimal" : key === "laneCount" ? "numeric" : undefined} {...common} />}
      {errors[key] && <p id={`raft-error-${key}`} role="alert" className={styles.fieldError}>{errors[key]}</p>}
    </div>;
  })}</div>;
}

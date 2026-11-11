"use client";
import type { Dispatch, SetStateAction } from "react";
import { Field } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { zoneFields, type ZoneDraft, type ZoneField } from "./zone-model";

const decimal: readonly ZoneField[] = ["area", "latitude", "longitude"];
/** One input per zone field, in the same order and grid as the read-only facts. `only` limits the fields of a collapsible group. */
export function ZoneFormFields({ draft, setDraft, errors, only }: {
  draft: ZoneDraft; setDraft: Dispatch<SetStateAction<ZoneDraft>>; errors: Partial<Record<ZoneField, string>>; only?: readonly ZoneField[];
}) {
  return <div className={styles.fields}>{zoneFields.filter(([key]) => !only || only.includes(key)).map(([key, label]) => <div key={key}>
    <Field label={`${label} *`} required name={key} value={draft[key]} maxLength={key === "location" ? 300 : 100}
      inputMode={decimal.includes(key) ? "decimal" : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `zone-error-${key}` : undefined}
      onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
    {errors[key] && <p id={`zone-error-${key}`} role="alert" className={styles.fieldError}>{errors[key]}</p>}
  </div>)}</div>;
}

"use client";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import type { Dispatch, SetStateAction } from "react";
import { Field } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { MAX_ZONE_LOCATION, requiredZoneFields, zoneFields, type MapFilled, type ZoneDraft, type ZoneField } from "./zone-model";

/** Short hint under a field whose value came from reading the licence map. */
const fromMapHint = "Điền từ sơ đồ";
/**
 * One input per zone field, in the same order and grid as the read-only facts. `only` limits the fields of a collapsible group.
 * Only code and name carry `*`; Địa điểm and Diện tích are optional. `fromMap` marks the fields filled from the licence map.
 */
export function ZoneFormFields({ draft, setDraft, errors, only, fromMap, disabled }: {
  draft: ZoneDraft; setDraft: Dispatch<SetStateAction<ZoneDraft>>; errors: Partial<Record<ZoneField, string>>; only?: readonly ZoneField[]; fromMap?: Partial<MapFilled>; disabled?: boolean;
}) {
  if (!only) return <div className="space-y-3">
    <ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["code", "name"]} disabled={disabled} />
    <CollapsibleSection title="Vị trí và diện tích" description="Không bắt buộc." columns={1}><ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["location", "area"]} fromMap={fromMap} disabled={disabled} /></CollapsibleSection>
  </div>;
  const shown = zoneFields.filter(([key]) => only.includes(key));
  return <div className={`grid gap-x-5 gap-y-3 sm:grid-cols-2 ${only.includes("code") ? "mb-4" : ""}`}>{shown.map(([key, label]) => {
    const required = requiredZoneFields.includes(key), filled = key === "location" || key === "area" ? fromMap?.[key] : false;
    return <div key={key}>
      <Field label={required ? `${label} *` : label} required={required} disabled={disabled} name={key} value={draft[key]} maxLength={key === "location" ? MAX_ZONE_LOCATION : 100}
        inputMode={key === "area" ? "decimal" : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `zone-error-${key}` : filled ? `zone-hint-${key}` : undefined}
        onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
      {errors[key] && <p id={`zone-error-${key}`} role="alert" className={styles.fieldError}>{errors[key]}</p>}
      {filled && !errors[key] && <p id={`zone-hint-${key}`} className="mt-1 text-xs text-text-muted">{fromMapHint}</p>}
    </div>;
  })}</div>;
}

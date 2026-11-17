"use client";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import type { Dispatch, SetStateAction } from "react";
import { Field } from "@/features/operations/ui";
import { LocationPicker } from "@/features/farming-api/location-picker";
import styles from "@/features/farming-management/farming-management.module.css";
import { zoneFields, type ZoneDraft, type ZoneField } from "./zone-model";

const isCoordinate = (key: ZoneField) => key === "latitude" || key === "longitude";
/**
 * One input per zone field, in the same order and grid as the read-only facts. `only` limits the fields of a collapsible group.
 * Latitude and longitude are never typed: when they are part of the group they are chosen on a map and written back to the draft.
 */
export function ZoneFormFields({ draft, setDraft, errors, only }: {
  draft: ZoneDraft; setDraft: Dispatch<SetStateAction<ZoneDraft>>; errors: Partial<Record<ZoneField, string>>; only?: readonly ZoneField[];
}) {
  if (!only) return <div className="space-y-3">
    <ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["code", "name"]} />
    <CollapsibleSection title="Vị trí và diện tích" description="Địa điểm và quy mô vùng nuôi." columns={1}><ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["location", "area"]} /></CollapsibleSection>
    <CollapsibleSection title="Vị trí trên bản đồ" description="Chọn tọa độ vùng nuôi." columns={1}><ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["latitude", "longitude"]} /></CollapsibleSection>
  </div>;
  const shown = zoneFields.filter(([key]) => !only || only.includes(key));
  const typed = shown.filter(([key]) => !isCoordinate(key));
  const withMap = shown.some(([key]) => isCoordinate(key));
  return <>
    {typed.length > 0 && <div className={styles.fields}>{typed.map(([key, label]) => <div key={key}>
      <Field label={`${label} *`} required name={key} value={draft[key]} maxLength={key === "location" ? 300 : 100}
        inputMode={key === "area" ? "decimal" : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `zone-error-${key}` : undefined}
        onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
      {errors[key] && <p id={`zone-error-${key}`} role="alert" className={styles.fieldError}>{errors[key]}</p>}
    </div>)}</div>}
    {withMap && <div className={typed.length ? "mt-4" : undefined}>
      <LocationPicker id="zone-location" latitude={draft.latitude} longitude={draft.longitude} error={errors.latitude || errors.longitude ? "Chọn vị trí của vùng trên bản đồ." : undefined}
        onChange={next => setDraft(current => ({ ...current, ...next }))} />
    </div>}
  </>;
}

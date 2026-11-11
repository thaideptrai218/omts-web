"use client";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import type { Dispatch, SetStateAction } from "react";
import { Field, Note, Skeleton } from "@/features/operations/ui";
import { LocationPicker } from "@/features/farming-api/location-picker";
import styles from "@/features/farming-management/farming-management.module.css";
import type { RaftDraft, RaftField } from "./raft-model";
import { useRaftLocationPins } from "./use-raft-location-pins";

const labels: readonly (readonly [RaftField, string, boolean])[] = [["code", "Mã bè", true], ["size", "Kích thước", true], ["laneCount", "Số làn đang dùng", true], ["location", "Vị trí", false],
  ["conditionNotes", "Tình trạng bè", false]];
const isCoordinate = (key: RaftField) => key === "latitude" || key === "longitude";
/**
 * One input per raft field, in the same order and grid as the read-only facts. `only` limits the fields of a collapsible group.
 * Latitude and longitude are chosen on a map next to the zone and its other rafts (`zoneId`), never typed. `selfId` leaves the raft being edited out of those pins.
 */
export function RaftFormFields({ draft, setDraft, errors, only, zoneId, selfId }: {
  draft: RaftDraft; setDraft: Dispatch<SetStateAction<RaftDraft>>; errors: Partial<Record<RaftField, string>>; only?: readonly RaftField[]; zoneId: string; selfId?: string;
}) {
  if (!only) return <div className="space-y-3">
    <RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} selfId={selfId} only={["code"]} />
    <CollapsibleSection title="Thông tin bè" description="Kích thước, số làn và địa điểm bè." columns={1}><RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} selfId={selfId} only={["size", "laneCount", "location"]} /></CollapsibleSection>
    <CollapsibleSection title="Vị trí trên bản đồ và tình trạng" description="Tọa độ và tình trạng hiện tại của bè." columns={1}><RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} selfId={selfId} only={["latitude", "longitude", "conditionNotes"]} /></CollapsibleSection>
  </div>;
  const withMap = !only || only.some(isCoordinate), shown = labels.filter(([key]) => !only || only.includes(key));
  return <>
    {shown.length > 0 && <div className={styles.fields}>{shown.map(([key, label, required]) => {
      const common = { name: key, value: draft[key], "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `raft-error-${key}` : undefined,
        onChange: (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value })) };
      return <div key={key}>
        {key === "conditionNotes" ? <Note label={label} maxLength={1000} {...common} />
          : <Field label={required ? `${label} *` : label} required={required} maxLength={key === "location" || key === "size" ? 300 : 100} inputMode={key === "laneCount" ? "numeric" : undefined} {...common} />}
        {errors[key] && <p id={`raft-error-${key}`} role="alert" className={styles.fieldError}>{errors[key]}</p>}
      </div>;
    })}</div>}
    {withMap && <div className={shown.length ? "mt-4" : undefined}>
      <RaftLocationSection draft={draft} setDraft={setDraft} error={errors.latitude || errors.longitude ? "Chọn vị trí của bè trên bản đồ." : undefined} zoneId={zoneId} selfId={selfId} />
    </div>}
  </>;
}

/** Own component so the zone and raft reads only happen where a map is actually shown. */
function RaftLocationSection({ draft, setDraft, error, zoneId, selfId }: { draft: RaftDraft; setDraft: Dispatch<SetStateAction<RaftDraft>>; error?: string; zoneId: string; selfId?: string }) {
  const context = useRaftLocationPins(zoneId, selfId);
  return context.loading ? <Skeleton /> : <LocationPicker id="raft-location" latitude={draft.latitude} longitude={draft.longitude} pins={context.pins} error={error}
    onChange={next => setDraft(current => ({ ...current, ...next }))} />;
}

"use client";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { LocationPicker } from "./location-picker";
import { pinsOf, type ContextPin } from "./location-picker-model";
import { readZoneMap } from "./zone-map-repository";

type Props = {
  resource: "zones" | "rafts"; record: ApiRecord | null; values: Record<string, string>;
  setValues: Dispatch<SetStateAction<Record<string, string>>>; zones: ApiRecord[];
};
const loadMap = (signal: AbortSignal) => readZoneMap(false, signal);

/** Legacy definition-driven editors share the same picker and draft coordinate values as the dedicated forms. */
export function ResourceLocationPicker(props: Props) {
  return props.resource === "rafts" ? <RaftResourceLocationPicker {...props} /> : <PickerFields {...props} pins={[]} />;
}

function RaftResourceLocationPicker(props: Props) {
  const remote = useRemote(loadMap);
  const reference = props.record?.zone;
  const zoneId = typeof props.record?.zoneId === "string" ? props.record.zoneId
    : reference && typeof reference === "object" && "id" in reference && typeof reference.id === "string" ? reference.id
      : props.zones.length === 1 ? props.zones[0].id : undefined;
  const zone = remote.data?.find(row => row.id === zoneId || row.rafts.some(raft => raft.id === props.record?.id));
  const pins = zone ? [...pinsOf("zone", [zone]), ...pinsOf("raft", zone.rafts, props.record?.id)] : [];
  return remote.loading ? <div className="sm:col-span-2"><Skeleton /></div> : <PickerFields {...props} pins={pins} />;
}

function PickerFields({ resource, values, setValues, pins }: Props & { pins: ContextPin[] }) {
  const target = useRef<HTMLDivElement>(null), [missing, setMissing] = useState(false);
  return <div ref={target} className="relative sm:col-span-2">
    <LocationPicker id={`api-${resource}-location`} latitude={values.latitude ?? ""} longitude={values.longitude ?? ""} pins={pins}
      error={missing ? "Chọn vị trí của vùng trên bản đồ." : undefined}
      onChange={next => { setValues(current => ({ ...current, ...next })); setMissing(false); }} />
    {resource === "zones" && <input className="sr-only" aria-label="Vị trí vùng nuôi" tabIndex={-1} required
      value={values.latitude && values.longitude ? "selected" : ""} onChange={() => {}}
      onFocus={() => target.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus()}
      onInvalid={event => { event.preventDefault(); setMissing(true); target.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus(); }} />}
  </div>;
}

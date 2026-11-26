"use client";
import { useCallback, useRef, useState } from "react";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadInUseZones } from "@/features/zones-api/in-use-zones";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { WaterThresholdPanel } from "@/features/operations/water-threshold-panel";

/** Thiết lập > Ngưỡng cảnh báo nước: Chủ HTX chọn vùng nuôi rồi sửa ngưỡng của vùng đó (màn Chất lượng nước chỉ còn xem). */
export function WaterThresholdSettingsPanel() {
  const owner = useApiWorkspace().identity.subjectType === "CooperativeOwner";
  return owner ? <OwnerWaterThresholds /> : <p role="status">Chỉ Chủ hợp tác xã được quản lý ngưỡng cảnh báo nước.</p>;
}

function OwnerWaterThresholds() {
  const zones = useRemote(useCallback((signal: AbortSignal) => loadInUseZones(signal), []));
  const [zoneId, setZoneId] = useState("");
  const dirty = useRef(false), { notify } = useToast();
  const rows = zones.data ?? [], current = zoneId || String(rows[0]?.id ?? "");
  return <section aria-label="Ngưỡng cảnh báo nước" className="grid gap-4 py-4">
    <ErrorNotice error={zones.error} />
    {zones.loading ? <Skeleton /> : <>
      <label className="grid max-w-sm gap-1 text-sm font-semibold">Vùng nuôi
        <SelectBox className="omts-control" value={current} onChange={(event) => { dirty.current = false; setZoneId(event.target.value); }}>
          {rows.map((row) => <option key={String(row.id)} value={String(row.id)}>{String(row.name ?? row.code ?? row.id)}</option>)}
        </SelectBox>
      </label>
      {current && <WaterThresholdPanel key={current} zoneId={current} owner dirtyRef={dirty} onSaved={(message) => notify({ tone: "success", title: message })} />}
    </>}
  </section>;
}

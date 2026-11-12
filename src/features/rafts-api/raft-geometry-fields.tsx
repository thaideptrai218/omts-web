"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import type { RaftDraft, RaftDetail } from "./raft-model";
import { areaOf, geometryOf, laneOverrides } from "./raft-geometry";
import { composeRaftSize } from "./raft-size";
import { RaftLaneDiagram } from "./raft-lane-diagram";

export function RaftGeometryFields({ draft, setDraft, error, laneCountLocked, lanes = [], canEditLaneLengths = true }: {
  draft: RaftDraft; setDraft: Dispatch<SetStateAction<RaftDraft>>; error?: string; laneCountLocked?: string;
  lanes?: RaftDetail["lanes"]; canEditLaneLengths?: boolean;
}) {
  const initial = geometryOf({ size: draft.size });
  const [length, setLength] = useState(draft.lengthM || String(initial.length ?? ""));
  const [width, setWidth] = useState(draft.widthM || String(initial.width ?? ""));
  const update = (l: string, w: string) => { setLength(l); setWidth(w); setDraft(current => ({ ...current, lengthM: l, widthM: w, size: composeRaftSize(l, w) })); };
  const count = Math.min(200, Math.max(0, Math.floor(Number(draft.laneCount) || 0))), overrides = laneOverrides(draft.laneLines);
  // Keep historical numbers, including inactive lanes in the middle. Count changes concern the tail only.
  const active = lanes.filter(lane => lane.statusId !== 2002).sort((a, b) => a.laneNumber - b.laneNumber), removedMiddle = lanes.filter(lane => lane.statusId === 2002 && lane.laneNumber < Math.max(0, ...active.map(item => item.laneNumber)));
  const retained = active.slice(0, count), maximum = Math.max(0, ...active.map(lane => lane.laneNumber));
  const extra = Array.from({ length: Math.max(0, count - retained.length) }, (_, i) => ({ ...lanes.find(lane => lane.laneNumber === maximum + i + 1), laneNumber: maximum + i + 1, statusId: 2001 }));
  const displayed = [...retained, ...removedMiddle, ...extra].sort((a, b) => a.laneNumber - b.laneNumber).map(lane => ({ ...lane,
    lineLengthM: overrides[lane.laneNumber] ? Number(overrides[lane.laneNumber]) : Number(length) || undefined }));
  const changeCount = (value: string) => { if (!laneCountLocked) setDraft(current => ({ ...current, laneCount: value })); };
  const changeLine = (n: number, value: string) => setDraft(current => ({ ...current, laneLines: JSON.stringify({ ...laneOverrides(current.laneLines), [n]: value }) }));
  return <div className="space-y-3">
    {draft.size && !initial.length && !length && <p className="text-sm">Kích thước đã ghi: {draft.size}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <UnitField label="Độ dài dây *" unit="m" decimals={2} min={1} max={500} required value={length} onChange={next => update(next, width)} />
      <UnitField label="Chiều rộng bè *" unit="m" decimals={2} min={1} max={200} required value={width} onChange={next => update(length, next)} />
      <div aria-live="polite"><UnitField label="Diện tích" unit="m²" decimals={2} readOnly value={length && width ? String(areaOf(Number(length), Number(width))) : ""} onChange={() => {}} /></div>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex items-end gap-2">
      <Button key="decrease-lanes" type="button" variant="secondary" className="w-auto" aria-label="Bớt làn cuối" disabled={!!laneCountLocked || count <= 1} onClick={() => changeCount(String(count - 1))}>−</Button>
      <UnitField label="Số làn *" unit="làn" min={1} max={200} required disabled={!!laneCountLocked} value={draft.laneCount} onChange={changeCount} />
      <Button key="increase-lanes" type="button" variant="secondary" className="w-auto" aria-label="Thêm làn cuối" disabled={!!laneCountLocked || count >= 200} onClick={() => changeCount(String(count + 1))}>+</Button>
    </div>
    {laneCountLocked && <p className="text-xs text-text-muted">{laneCountLocked}</p>}
    {canEditLaneLengths && <details><summary className="cursor-pointer text-sm text-primary">Độ dài dây từng làn</summary><div className="my-2 max-h-64 space-y-2 overflow-y-auto">
      {displayed.filter(lane => lane.statusId !== 2002).map(lane => <div key={lane.laneNumber} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1"><UnitField label={`Làn ${lane.laneNumber}`} unit="m" decimals={2} min={1} max={Number(length) || 500} value={overrides[lane.laneNumber] || length} onChange={value => changeLine(lane.laneNumber, value)} /></div>
        <Button key={`reset-${lane.laneNumber}`} type="button" variant="secondary" className="w-auto" onClick={() => changeLine(lane.laneNumber, "")}>Theo bè</Button>
      </div>)}
    </div></details>}
    <RaftLaneDiagram lanes={displayed} length={Number(length) || undefined} />
    {count > 0 && Number(width) > 0 && Number(width) / count < 1 && <p className="text-xs">Mỗi làn rộng dưới 1 m; kiểm tra lại chiều rộng bè.</p>}
  </div>;
}

"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { UnitField } from "@/components/form/number-fields";
import { UnitInput } from "@/components/form/unit-input";
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
    <div className="grid gap-3 sm:grid-cols-2">
      <UnitField label="Độ dài dây *" unit="m" decimals={2} min={1} max={500} required value={length} onChange={next => update(next, width)} />
      <UnitField label="Chiều rộng bè *" unit="m" decimals={2} min={1} max={200} required value={width} onChange={next => update(length, next)} />
      <div className="flex items-end gap-2">
      <Button key="decrease-lanes" type="button" variant="secondary" className="w-auto" aria-label="Bớt làn cuối" disabled={!!laneCountLocked || count <= 1} onClick={() => changeCount(String(count - 1))}>−</Button>
      <div className="min-w-0 flex-1"><UnitField label="Số làn *" unit="làn" min={1} max={200} required disabled={!!laneCountLocked} value={draft.laneCount} onChange={changeCount} /></div>
      <Button key="increase-lanes" type="button" variant="secondary" className="w-auto" aria-label="Thêm làn cuối" disabled={!!laneCountLocked || count >= 200} onClick={() => changeCount(String(count + 1))}>+</Button>
      </div>
      <div aria-live="polite" className="rounded-control border border-border bg-surface-muted px-4 py-2"><span className="block text-xs text-text-muted">Diện tích tự tính</span><output aria-label="Diện tích" className="block text-xl font-semibold tabular-nums text-primary">{length && width ? areaOf(Number(length), Number(width)).toLocaleString("vi-VN") : "—"} <span className="text-sm font-normal">m²</span></output></div>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {laneCountLocked && <p className="text-xs text-text-muted">{laneCountLocked}</p>}
    {canEditLaneLengths && <details className="rounded-control border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-medium text-primary">Độ dài từng làn (tùy chọn)</summary><div className="max-h-64 overflow-auto px-3 pb-3">
      <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-surface"><tr><th className="py-2 font-medium">Làn</th><th className="py-2 font-medium">Độ dài dây (m)</th><th><span className="sr-only">Đặt lại</span></th></tr></thead><tbody>
      {displayed.filter(lane => lane.statusId !== 2002).map(lane => <tr key={lane.laneNumber} className="border-t border-border">
        <th scope="row" className="w-16 py-1 font-medium">{lane.laneNumber}</th>
        <td className="w-48 py-1"><UnitInput label={`Độ dài làn ${lane.laneNumber}`} unit="m" decimals={2} min={1} max={Number(length) || 500} value={Number(overrides[lane.laneNumber] || length) || null} onChange={value => changeLine(lane.laneNumber, value == null ? "" : String(value))} /></td>
        <td className="py-1 pl-3 text-right"><button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => changeLine(lane.laneNumber, "")}>Theo bè</button></td>
      </tr>)}
      </tbody></table>
    </div></details>}
    <RaftLaneDiagram lanes={displayed} length={Number(length) || undefined} />
    {count > 0 && Number(width) > 0 && Number(width) / count < 1 && <p className="text-xs">Mỗi làn rộng dưới 1 m; kiểm tra lại chiều rộng bè.</p>}
  </div>;
}

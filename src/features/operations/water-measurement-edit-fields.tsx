"use client";
import type { Dispatch, SetStateAction } from "react";
import { Field, Note, Select } from "./ui";
import type { WaterDraft } from "./water-correction-model";

/** Inputs of the in-place correction: the same grid as the read-only facts, plus the required reason. */
export function WaterEditFields({ draft, setDraft, rafts }: { draft: WaterDraft; setDraft: Dispatch<SetStateAction<WaterDraft>>; rafts: readonly { id: string; code: string }[] }) {
  const bind = (key: keyof WaterDraft) => ({ value: draft[key], onChange: (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value })) });
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <Select label="Bè đo *" required {...bind("raftId")}>{rafts.map(raft => <option key={raft.id} value={raft.id}>{raft.code}</option>)}</Select>
    <Field label="Thời điểm đo (giờ Việt Nam) *" required type="datetime-local" {...bind("measuredAt")} />
    <Field label="pH (0–14) *" required type="number" min="0" max="14" step="0.01" {...bind("ph")} />
    <Field label="Độ mặn (‰, 0–100) *" required type="number" min="0" max="100" step="0.01" {...bind("salinity")} />
    <Field label="Nhiệt độ (°C, 0–100) *" required type="number" min="0" max="100" step="0.01" {...bind("temperature")} />
    <div className="sm:col-span-2 lg:col-span-3"><Note label="Lý do hiệu chỉnh *" required maxLength={1000} rows={2} {...bind("reason")} /></div>
  </div>;
}

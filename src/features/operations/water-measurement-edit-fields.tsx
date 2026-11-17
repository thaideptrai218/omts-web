"use client";
import type { Dispatch, SetStateAction } from "react";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Note, Select } from "./ui";
import { WaterValueFields } from "./water-value-fields";
import type { WaterDraft } from "./water-correction-model";

/** Inputs of the in-place correction: the same grid as the read-only facts, plus the required reason. */
export function WaterEditFields({ draft, setDraft, rafts }: { draft: WaterDraft; setDraft: Dispatch<SetStateAction<WaterDraft>>; rafts: readonly { id: string; code: string }[] }) {
  const bind = (key: keyof WaterDraft) => ({ value: draft[key], onChange: (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value })) });
  return <div className="space-y-3"><CollapsibleSection title="Phép đo" description="Bè và thời điểm ghi nhận." columns={2}>
    <Select label="Bè đo *" required {...bind("raftId")}>{rafts.map(raft => <option key={raft.id} value={raft.id}>{raft.code}</option>)}</Select>
    </CollapsibleSection><CollapsibleSection title="Chỉ số nước" description="Thời điểm và giá trị đã đối chiếu với ảnh máy đo." columns={2}>
    <WaterValueFields values={draft} onChange={(key, value) => setDraft(current => ({ ...current, [key]: value }))} />
    </CollapsibleSection>
    <div className="sm:col-span-2 lg:col-span-3"><Note label="Lý do hiệu chỉnh *" required maxLength={1000} rows={2} {...bind("reason")} /></div>
  </div>;
}

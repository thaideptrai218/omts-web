"use client";
import { useState } from "react";
import { HistoryEntries } from "@/features/history/record-history";
import type { LaneIncident } from "./lane-incident-contracts";

const reasonLabels: Record<string, string> = { LineBroken: "Đứt dây", BuoyDamaged: "Hỏng phao", Storm: "Bão", MassMortality: "Chết hàng loạt", Other: "Lý do khác" };
export function LaneIncidentHistory({ incidents }: { incidents: LaneIncident[] }) {
  const [open, setOpen] = useState(false);
  return <section aria-label="Lịch sử làn" className="mt-2 border-t border-border pt-2">
    <button key="toggle-history" type="button" className="text-xs font-semibold underline" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Ẩn lịch sử" : "Lịch sử"}</button>
    {open && <div className="mt-2"><HistoryEntries entries={[...incidents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map(incident => ({
      at: incident.occurredAt, action: incident.kind, byName: incident.recordedByName, reason: incident.reason,
      note: [incident.reasonCode ? reasonLabels[incident.reasonCode] : undefined, incident.kind === "OutOfService" && incident.hadSeed ? "Đã ghi mất giống, không số lượng" : undefined].filter(Boolean).join(" · ") || undefined,
      changes: (incident.materials ?? []).map(material => ({ field: material.itemId, label: `Vật tư ${material.itemCode ?? material.itemName ?? ""} (${material.unit})${material.issueCode ? ` · phiếu ${material.issueCode}` : ""}`, from: null, to: material.quantity })),
    }))} />{incidents.filter(incident => incident.photos?.some(photo => photo.url)).map(incident => <div key={incident.id} className="mt-2 flex flex-wrap gap-3 text-xs">{incident.photos?.map((photo, index) => photo.url && /^\/api\/operations\/raft-details\?/.test(photo.url) ? <a key={photo.id ?? index} href={photo.url} target="_blank" rel="noreferrer" className="text-primary underline">Ảnh sự cố {index + 1}</a> : null)}</div>)}</div>}
  </section>;
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoneMapDialog } from "./zone-map-dialog";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
export function RecordMap({ resource, record }: { resource: string; record: ApiRecord }) {
  const [open, setOpen] = useState(false);
  if (resource !== "zones" && resource !== "rafts") return null;
  const label = String(record.name ?? record.code ?? "");
  return <div className="mt-4"><Button className="w-auto" variant="secondary" onClick={() => setOpen(true)}>Xem vị trí trên bản đồ</Button>{open && <ZoneMapDialog label={label} zoneId={resource === "zones" ? record.id : undefined} raftId={resource === "rafts" ? record.id : undefined} onClose={() => setOpen(false)} />}</div>;
}

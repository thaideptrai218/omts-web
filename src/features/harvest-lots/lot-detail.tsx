"use client";
import { useCallback, useState } from "react";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { HarvestRaftProgress } from "@/features/cultivation-api/harvest-raft-progress-bar";
import { HarvestLotDetail } from "@/features/cultivation-api/harvest-detail";
import { RecordHistoryList } from "@/features/history/record-history";
import { Skeleton, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { LotHarvestActions, LotInfoActions, type LotMode } from "./lot-actions";
import { LotCloseDialog } from "./lot-close-dialog";
import { LotHarvestTab } from "./lot-harvest-tab";
import { LotInfoTab } from "./lot-info-tab";
import { LotReopenDialog } from "./lot-reopen-dialog";
import { LotSalesTab } from "./lot-sales-tab";
import { LotWeighForm } from "./lot-weigh-form";
import { lotRepository } from "./repository";

type Tab = "info" | "harvest" | "sales" | "history";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "harvest" as const, label: "Thu hoạch" }, { key: "sales" as const, label: "Bán hàng" }, { key: "history" as const, label: "Lịch sử" }];

/**
 * The row opened under the list, laid out like the invoice row: four tabs (the lot, the harvest trip, what was sold of it, the history), each with the buttons that fit it.
 * Weighing and correcting open inline in the row; closing and reopening are pop-ups. The buttons come from the `can*` flags of the API and the rights of the account in the lot's zone.
 */
export function LotDetailPanel({ id, zoneId, startWeighing = false, onChanged, onRemoved }: { id: string; zoneId: string; /** Opens on the weighing sheet (a link right after a harvest was recorded). */ startWeighing?: boolean; onChanged(): void; onRemoved(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => lotRepository.detail(id, zoneId, signal), [id, zoneId]));
  const [tab, setTab] = useState<Tab>("info"), [mode, setMode] = useState<LotMode>(startWeighing ? "weigh" : "view");
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được lô thu hoạch."} onRetry={remote.reload} retryLabel="Tải lại lô" />;
  const lot = remote.data, done = () => { setMode("view"); remote.reload(); onChanged(); };
  if (mode === "edit") return <HarvestLotDetail id={lot.id} zoneId={zoneId} onClose={() => setMode("view")} onSaved={done} />;
  if (mode === "weigh") return <LotWeighForm lot={lot} zoneId={zoneId} onClose={() => setMode("view")} onSaved={done} />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${lot.lotCode}`}>
    <div className="mb-3"><HarvestRaftProgress raftId={lot.raftId} zoneId={zoneId} /></div>
    <Subtabs<Tab> label="Nội dung lô thu hoạch" tabs={tabs} value={tab} onChange={setTab} />
    <div className={listStyles.tabBody} key={lot.rowVersion}>
      {tab === "info" && <><LotInfoTab lot={lot} /><LotInfoActions lot={lot} zoneId={zoneId} onMode={setMode} onRemoved={onRemoved} /></>}
      {tab === "harvest" && <><LotHarvestTab lot={lot} /><LotHarvestActions lot={lot} zoneId={zoneId} onMode={setMode} /></>}
      {tab === "sales" && <LotSalesTab lotId={lot.id} zoneId={zoneId} />}
      {tab === "history" && <RecordHistoryList kind="harvest" id={lot.id} zoneId={zoneId} />}
    </div>
    {mode === "close" && <LotCloseDialog lot={lot} zoneId={zoneId} onClose={() => setMode("view")} onSaved={done} />}
    {mode === "reopen" && <LotReopenDialog lot={lot} zoneId={zoneId} onClose={() => setMode("view")} onSaved={done} />}
  </section>;
}

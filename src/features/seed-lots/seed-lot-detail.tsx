"use client";
import { useCallback, useState } from "react";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { Skeleton, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { SeedLotInfoTab } from "./seed-lot-info-tab";
import { SeedLotHistoryTab, SeedLotNurseryTab, SeedLotReturnsTab, SeedLotSeedingTab } from "./seed-lot-tabs";
import { seedLotRepository } from "./repository";

type Tab = "info" | "nursery" | "seeding" | "returns" | "history";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "nursery" as const, label: "Ươm" }, { key: "seeding" as const, label: "Thả giống" }, { key: "returns" as const, label: "Trả hàng" }, { key: "history" as const, label: "Lịch sử" }];

/**
 * The row opened under the list, laid out like the harvest lot row: five tabs (the lot, its nursery batches, its seedings with the cycles and harvest lots, its returns and issues, its history),
 * each with the buttons that fit it. Opening the lot is the only thing the screen reads; every action goes to the screen that owns it with the lot already chosen.
 */
export function SeedLotDetailPanel({ id }: { id: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => seedLotRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được lô giống."} onRetry={remote.reload} retryLabel="Tải lại lô giống" />;
  const lot = remote.data;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${lot.seedLotCode}`}>
    <Subtabs<Tab> label="Nội dung lô giống" tabs={tabs} value={tab} onChange={setTab} />
    <div className={listStyles.tabBody}>
      {tab === "info" && <SeedLotInfoTab lot={lot} />}
      {tab === "nursery" && <SeedLotNurseryTab lot={lot} />}
      {tab === "seeding" && <SeedLotSeedingTab lot={lot} />}
      {tab === "returns" && <SeedLotReturnsTab lot={lot} />}
      {tab === "history" && <SeedLotHistoryTab lot={lot} />}
    </div>
  </section>;
}

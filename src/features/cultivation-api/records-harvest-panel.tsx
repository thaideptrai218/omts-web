"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/ui/management-screen/management-layout";

import { ErrorNotice, Field, Paging, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { cagesFromKg, formatCages } from "@/shared/format/cage-quantity";
import { matchesSelection } from "@/shared/presentation/filter-selection";
import { CagesWithEstimatedKg } from "./harvest-quantity-cell";
import flowStyles from "./cultivation-flow.module.css";
import { HarvestLotPreview } from "./harvest-lot-preview";
import { HarvestRecordsTable } from "./harvest-records-table";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { HarvestLanesBoard } from "./harvest-lanes-board";
import { HarvestPlanSummary } from "./harvest-plan-summary";


import * as c from "./records-contracts";
import { HarvestForm } from "./records-harvest-form";
import { harvestRepo, useAllowed } from "./records-shared";

/** Every lane that has seed is Harvested (and at least one lane was seeded): the cycle can be closed. */
const everySeededLaneHarvested = (lanes: z.infer<typeof c.harvestLane>[]) => lanes.some(lane => lane.state === "Harvested" || lane.state === "OutOfService") && lanes.every(lane => lane.state === "Harvested" || lane.state === "OutOfService" || lane.state === "NotSeeded");

/** Harvest lots of a raft with search/status filters, filtered totals and an inline lot preview. */
export function HarvestPanel({ zoneId, raftId }: { zoneId: string; raftId: string }) {
  const allowed = useAllowed("harvest", zoneId);
  const [adding, setAdding] = useState(false);

  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) => harvestRepo.read("list", { id: raftId, zoneId }, c.harvestList, signal),
      [raftId, zoneId],
    ),
  );
  const query = useSearchParams();
  const [search, setSearch] = useState(() => query.get("search") ?? "");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<number>();
  const [selectedLot, setSelectedLot] = useState<string | undefined>(() => query.get("recordId") ?? undefined);
  // The API reports lot status in either casing.
  const statusLabel = (value: string) =>
    ({
      Open: "Đang mở",
      Closed: "Đã đóng",
      Reopened: "Mở lại",
      OPEN: "Đang mở",
      CLOSED: "Đã đóng",
      REOPENED: "Mở lại",
    })[value] ?? value;
  const rows =
    remote.data?.lots.filter(
      (lot) =>
        matchesSelection(status, String(lot.statusId)) &&
        lot.lotCode.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")),
    ) ?? [];
  // A lot deep link must open the page containing its row, including lots beyond the first ten.
  const linkedPage = Math.max(1, Math.ceil((rows.findIndex(lot => lot.id === query.get("recordId")) + 1) / 10));
  const currentPage = Math.min(page ?? linkedPage, Math.max(1, Math.ceil(rows.length / 10)));
  const canShowApproximateCageTotals = rows.every(
    (lot) => cagesFromKg(lot.invoicedKg, lot.kgPerCage) !== undefined && cagesFromKg(lot.remainingKg, lot.kgPerCage) !== undefined,
  );
  const totals = rows.reduce(
    (sum, lot) => ({
      cages: sum.cages + lot.cageCount,
      estimated: sum.estimated + lot.estimatedKg,
      invoiced: sum.invoiced + lot.invoicedKg,
      remaining: sum.remaining + lot.remainingKg,
      // Convert each lot with its own recorded kg/lồng; totals are hidden if any ratio is unavailable.
      invoicedCages: sum.invoicedCages + (cagesFromKg(lot.invoicedKg, lot.kgPerCage) ?? 0),
      remainingCages: sum.remainingCages + (cagesFromKg(lot.remainingKg, lot.kgPerCage) ?? 0),
    }),
    { cages: 0, estimated: 0, invoiced: 0, remaining: 0, invoicedCages: 0, remainingCages: 0 },
  );
  return (
    <section className={flowStyles.recordsPanel}>
      <ErrorNotice error={remote.error} />
      <div className={flowStyles.panelHeading}>
        <div>
          <h3>Các lô thu hoạch</h3>

        </div>
        <div className={flowStyles.actions}>
          {remote.data?.canRecordHarvest && allowed("Create") && (
            <Button type="button" disabled={remote.loading} onClick={() => setAdding(true)}>Ghi nhận thu hoạch</Button>
          )}
          <Button type="button" variant="secondary" disabled={remote.loading} onClick={remote.reload}>
            Tải lại
          </Button>
        </div>
      </div>
      {remote.loading ? (
        <Skeleton />
      ) : (
        remote.data && (
          <>
            <p className={flowStyles.harvestContext}>
              {remote.data.cycle
                ? `Chu kỳ từ ${formatVietnameseDate(remote.data.cycle.startDate)}`
                : "Bè chưa có chu kỳ đang nuôi"}
              <span>
                Ước tính kg cho lượt ghi mới:{" "}
                <strong>{remote.data.averageKgPerCage.toLocaleString("vi-VN")} kg/lồng</strong>
              </span>
            </p>
            <HarvestPlanSummary data={remote.data} />
            <HarvestLanesBoard data={remote.data} zoneId={zoneId} raftId={raftId} canFinish={remote.data.canRecordHarvest && allowed("Create")} onChanged={remote.reload} />
            {remote.data.cycle && everySeededLaneHarvested(remote.data.lanes) && <p role="status" className="mb-3 rounded-control border border-success/30 bg-success/5 p-3 text-sm">Tất cả làn đã thu xong. <Link href={farmingReferenceHref("cycle", { zoneId, raftId, cycleId: remote.data.cycle.id, tab: "journey" })}>Kết thúc chu kỳ</Link></p>}
            <div className={flowStyles.harvestFilters}>
              <Field
                label="Tìm mã lô"
                type="search"
                placeholder="Nhập mã lô thu hoạch…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <FilterPills
                legend="Trạng thái lô"
                name="harvest-lot-status"
                value={status}
                options={[
                  ...new Map(remote.data.lots.map((lot) => [String(lot.statusId), statusLabel(lot.status)])).entries(),
                ]}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
              <span>
                {rows.length}/{remote.data.lots.length} lô
              </span>
            </div>
            <HarvestRecordsTable rows={rows.slice((currentPage - 1) * 10, currentPage * 10)} selectedLot={selectedLot} zoneId={zoneId} statusLabel={statusLabel} onSelect={setSelectedLot} onSaved={remote.reload} />
            {selectedLot && !remote.data.lots.some(lot => lot.id === selectedLot) && <HarvestLotPreview id={selectedLot} zoneId={zoneId} onClose={() => setSelectedLot(undefined)} onSaved={() => { setSelectedLot(undefined); remote.reload(); }} />}
            <div className={flowStyles.harvestTotals}>
              <span>Tổng các lô phù hợp bộ lọc</span>
              <dl>
                <div>
                  <dt>Số lồng thu hoạch</dt>
                  <dd>
                    <CagesWithEstimatedKg cages={totals.cages} kg={totals.estimated} />
                  </dd>
                </div>
                {(
                  [
                    ["Đã bán", totals.invoiced, totals.invoicedCages],
                    ["Còn để bán", totals.remaining, totals.remainingCages],
                  ] as const
                ).map(([label, kg, cages]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {kg.toLocaleString("vi-VN")} kg
                      <span className="mt-1 block text-xs font-normal text-text-muted">
                        {canShowApproximateCageTotals ? formatCages(cages, { approx: true }) : "Chưa đủ dữ liệu tỷ lệ quy đổi"}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={flowStyles.tablePaging}>
              <Paging page={currentPage} total={rows.length} pageSize={10} onChange={setPage} />
            </div>


            {adding && (
              <HarvestForm
                canConfigure={allowed("Owner")}
                zoneId={zoneId}
                raftId={raftId}
                data={remote.data}
                onClose={() => setAdding(false)}
                onSaved={() => {
                  setAdding(false);
                  remote.reload();
                }}
              />
            )}
          </>
        )
      )}
    </section>
  );
}

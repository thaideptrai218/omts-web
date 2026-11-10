"use client";
import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChecks } from "@/components/ui/filter-checks";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataTable, ErrorNotice, Field, Paging, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { matchesSelection } from "@/shared/presentation/filter-selection";
import flowStyles from "./cultivation-flow.module.css";
import { HarvestLotPreview } from "./harvest-lot-preview";
import { HarvestSettings } from "./harvest-settings";
import * as c from "./records-contracts";
import { HarvestForm } from "./records-harvest-form";
import { harvestRepo, useAllowed } from "./records-shared";

/** Harvest lots of a raft with search/status filters, filtered totals and an inline lot preview. */
export function HarvestPanel({ zoneId, raftId }: { zoneId: string; raftId: string }) {
  const allowed = useAllowed("harvest", zoneId);
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) => harvestRepo.read("list", { id: raftId, zoneId }, c.harvestList, signal),
      [raftId, zoneId],
    ),
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLot, setSelectedLot] = useState<string>();
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
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  const totals = rows.reduce(
    (sum, lot) => ({
      cages: sum.cages + lot.cageCount,
      estimated: sum.estimated + lot.estimatedKg,
      invoiced: sum.invoiced + lot.invoicedKg,
      remaining: sum.remaining + lot.remainingKg,
    }),
    { cages: 0, estimated: 0, invoiced: 0, remaining: 0 },
  );
  return (
    <section className={flowStyles.recordsPanel}>
      <ErrorNotice error={remote.error} />
      <div className={flowStyles.panelHeading}>
        <div>
          <h3>Các lô thu hoạch</h3>
          <p>Chọn mã lô để xem sản lượng, ảnh và lịch sử ghi nhận.</p>
        </div>
        <div className={flowStyles.actions}>
          <Button variant="secondary" disabled={remote.loading} onClick={remote.reload}>
            Tải lại
          </Button>
          {allowed("Owner") && (
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
              Quy đổi & tự đóng lô
            </Button>
          )}
          {remote.data?.canRecordHarvest && allowed("Create") && (
            <Button onClick={() => setAdding(true)}>Ghi nhận thu hoạch</Button>
          )}
        </div>
      </div>
      {settingsOpen && (
        <HarvestSettings
          onClose={() => {
            setSettingsOpen(false);
            remote.reload();
          }}
        />
      )}
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
                Quy đổi cho lượt ghi mới:{" "}
                <strong>{remote.data.averageKgPerCage.toLocaleString("vi-VN")} kg/lồng</strong>
              </span>
            </p>
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
              <FilterChecks
                label="Trạng thái lô"
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
            <div className={flowStyles.harvestTable}>
              <DataTable
                responsive
                headings={[
                  "Mã lô / thời điểm",
                  "Làn thu hoạch",
                  "Lồng",
                  "Ước tính (kg)",
                  "Đã lập hóa đơn (kg)",
                  "Còn lại (kg)",
                  "Trạng thái",
                ]}
                empty={!rows.length}
              >
                {rows.slice((currentPage - 1) * 10, currentPage * 10).map((lot) => (
                  <Fragment key={lot.id}>
                    <OpenableTableRow
                      data-selected={selectedLot === lot.id || undefined}
                      onOpen={() => setSelectedLot((value) => (value === lot.id ? undefined : lot.id))}
                    >
                      <td data-label="Mã lô / thời điểm">
                        <button
                          type="button"
                          className={flowStyles.recordLink}
                          aria-expanded={selectedLot === lot.id}
                          onClick={() => setSelectedLot((value) => (value === lot.id ? undefined : lot.id))}
                        >
                          {lot.lotCode}
                        </button>
                        <span className="mt-1 block whitespace-nowrap text-xs text-text-muted">
                          {displayTime(lot.harvestedAt)}
                        </span>
                      </td>
                      <td data-label="Làn thu hoạch">
                        {lot.laneNumbers.join(", ")}
                        <span className="mt-1 block text-xs text-text-muted">
                          Đã thu hết: {lot.finishedLaneNumbers.join(", ") || "Chưa có"}
                        </span>
                      </td>
                      <td data-label="Lồng" className="text-right tabular-nums">
                        {lot.cageCount.toLocaleString("vi-VN")}
                      </td>
                      <td data-label="Ước tính (kg)" className="text-right tabular-nums">
                        {lot.estimatedKg.toLocaleString("vi-VN")}
                      </td>
                      <td data-label="Đã lập hóa đơn (kg)" className="text-right tabular-nums">
                        {lot.invoicedKg.toLocaleString("vi-VN")}
                      </td>
                      <td data-label="Còn lại (kg)" className="text-right font-semibold tabular-nums">
                        {lot.remainingKg.toLocaleString("vi-VN")}
                      </td>
                      <td data-label="Trạng thái">
                        <span className={flowStyles.state}>{statusLabel(lot.status)}</span>
                      </td>
                    </OpenableTableRow>
                    {selectedLot === lot.id && (
                      <tr>
                        <td colSpan={7} className={flowStyles.recordDetailCell}>
                          <HarvestLotPreview
                            id={lot.id}
                            zoneId={zoneId}
                            onClose={() => setSelectedLot(undefined)}
                            onSaved={() => {
                              setSelectedLot(undefined);
                              remote.reload();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </DataTable>
            </div>
            <div className={flowStyles.harvestTotals}>
              <span>Tổng các lô phù hợp bộ lọc</span>
              <dl>
                {[
                  ["Lồng", totals.cages],
                  ["Ước tính (kg)", totals.estimated],
                  ["Đã lập hóa đơn (kg)", totals.invoiced],
                  ["Còn lại (kg)", totals.remaining],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{Number(value).toLocaleString("vi-VN")}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={flowStyles.tablePaging}>
              <Paging page={currentPage} total={rows.length} pageSize={10} onChange={setPage} />
            </div>
            <p className={flowStyles.harvestHint}>
              Sản lượng ước tính và số lượng đã lập hóa đơn là các chỉ số riêng. Mở hồ sơ lô để xem lượng đã bán, trả
              lại, hao hụt và chênh lệch.
            </p>
            {adding && (
              <HarvestForm
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

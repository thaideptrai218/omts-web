"use client";
import { Fragment, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataTable, ErrorNotice, Paging, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { CompleteSeeding } from "./records-complete-seeding-dialog";
import { SeedingForm } from "./records-seeding-form";
import { seedRepo, useAllowed } from "./records-shared";

/** Seeding records of the raft's current cycle, per-lot totals and the "mark seeding complete" action. */
export function SeedingPanel({ zoneId, raftId, cycleId }: { zoneId: string; raftId: string; cycleId: string }) {
  const [expanded, setExpanded] = useState<string>();
  const allowed = useAllowed("seeding", zoneId);
  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) => seedRepo.read("list", { id: cycleId, zoneId }, c.seedingList, signal),
      [cycleId, zoneId],
    ),
  );
  const [selected, setSelected] = useState<z.infer<typeof c.seedingRecord> | null>();
  const [completing, setCompleting] = useState(false);
  const data = remote.data;
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, Math.max(1, Math.ceil((data?.records.length ?? 0) / 10)));
  const visible = data?.records.slice((currentPage - 1) * 10, currentPage * 10) ?? [];
  return (
    <section className={flowStyles.recordsPanel}>
      <ErrorNotice error={remote.error} />
      <div className={flowStyles.panelHeading}>
        <div>
          <h3>Các lần thả giống</h3>
          <p>
            {data
              ? `${data.records.length} lần ghi nhận · ${data.seededCount}/${data.laneCount} làn đã thả giống`
              : "Theo dõi giống trong chu kỳ đang chọn"}
          </p>
        </div>
        <div className={flowStyles.actions}>
          <Button variant="secondary" disabled={remote.loading} onClick={remote.reload}>
            Tải lại
          </Button>
          {data?.canRecord && allowed("Create") && (
            <Button onClick={() => setSelected(null)}>Ghi nhận thả giống</Button>
          )}
        </div>
      </div>
      {remote.loading ? (
        <Skeleton />
      ) : (
        data && (
          <>
            <div className={flowStyles.completion}>
              <span>
                {data.seedingCompletedOn
                  ? `Hoàn tất thả giống ngày ${formatVietnameseDate(data.seedingCompletedOn)}`
                  : "Chưa đánh dấu hoàn tất thả giống"}
              </span>
              {data.canMarkComplete && allowed("Create") && (
                <Button variant="secondary" onClick={() => setCompleting(true)}>
                  Đánh dấu hoàn tất
                </Button>
              )}
            </div>
            <DataTable
              responsive
              headings={["Ngày thả", "Lô giống / nhà cung cấp", "Làn", "Số lượng", "Người ghi nhận"]}
              empty={!data.records.length}
            >
              {visible.map((v) => (
                <Fragment key={v.id}>
                  <OpenableTableRow
                    data-selected={expanded === v.id || undefined}
                    onOpen={() => setExpanded((current) => (current === v.id ? undefined : v.id))}
                  >
                    <td data-label="Ngày thả">
                      <button
                        type="button"
                        className={flowStyles.recordLink}
                        aria-label={`Chi tiết thả giống ngày ${formatVietnameseDate(v.seedingDate)}`}
                        aria-expanded={expanded === v.id}
                        onClick={() => setExpanded((current) => (current === v.id ? undefined : v.id))}
                      >
                        {formatVietnameseDate(v.seedingDate)}
                      </button>
                    </td>
                    <td data-label="Lô giống / nhà cung cấp">
                      <strong>{v.seedLot.code}</strong>
                      <span className="block text-xs text-text-muted">{v.seedLot.supplierName}</span>
                    </td>
                    <td data-label="Làn">{v.laneNumbers.join(", ")}</td>
                    <td data-label="Số lượng" className="whitespace-nowrap text-right tabular-nums">
                      {v.quantity.toLocaleString("vi-VN")} {v.seedLot.unit}
                    </td>
                    <td data-label="Người ghi nhận">{v.recordedByName ?? "—"}</td>
                  </OpenableTableRow>
                  {expanded === v.id && (
                    <tr>
                      <td colSpan={5} className={flowStyles.recordDetailCell}>
                        <section className={flowStyles.recordDetail} aria-label="Chi tiết lần thả giống">
                          <h4>Thả giống · {formatVietnameseDate(v.seedingDate)}</h4>
                          <dl>
                            <div>
                              <dt>Lô giống</dt>
                              <dd>
                                {v.seedLot.code} · {v.seedLot.itemName ?? "Giống"}
                              </dd>
                            </div>
                            <div>
                              <dt>Phiếu nhập</dt>
                              <dd>{v.seedLot.receiptCode}</dd>
                            </div>
                            <div>
                              <dt>Nhà cung cấp</dt>
                              <dd>{v.seedLot.supplierName}</dd>
                            </div>
                            <div>
                              <dt>Làn đã thả</dt>
                              <dd>{v.laneNumbers.join(", ")}</dd>
                            </div>
                            <div>
                              <dt>Số lượng cả lần thả</dt>
                              <dd>
                                {v.quantity.toLocaleString("vi-VN")} {v.seedLot.unit}
                              </dd>
                            </div>
                            <div>
                              <dt>Người ghi nhận / thời điểm</dt>
                              <dd>
                                {v.recordedByName ?? "—"} · {displayTime(v.recordedAt)}
                              </dd>
                            </div>
                          </dl>
                          <p>Số lượng thuộc cả lần thả giống, không chia đều cho từng làn.</p>
                          {!v.canCorrect && (
                            <p>Bản ghi đã khóa theo trạng thái chu kỳ hoặc lô thu hoạch; hiện chỉ được xem.</p>
                          )}
                          <footer>
                            {v.canCorrect && (allowed("Edit") || allowed("Delete")) && (
                              <Button className="w-auto" onClick={() => setSelected(v)}>
                                {allowed("Edit") ? "Chỉnh sửa lần thả giống" : "Xử lý lần thả giống"}
                              </Button>
                            )}
                            <Button className="w-auto" variant="secondary" onClick={() => setExpanded(undefined)}>
                              Thu gọn
                            </Button>
                          </footer>
                        </section>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </DataTable>
            <div className={flowStyles.tablePaging}>
              <Paging page={currentPage} total={data.records.length} pageSize={10} onChange={setPage} />
            </div>
            <details className={flowStyles.lotSummary}>
              <summary>Tổng giống theo lô · {data.lots.length} lô</summary>
              <DataTable headings={["Lô giống", "Số lượng đã thả"]} empty={!data.lots.length}>
                {data.lots.map((v) => (
                  <tr key={v.seedLotId}>
                    <td>{v.code}</td>
                    <td className="text-right tabular-nums">
                      {v.quantity.toLocaleString("vi-VN")} {v.unit}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </details>
            {selected !== undefined && (
              <SeedingForm
                zoneId={zoneId}
                raftId={raftId}
                cycleId={cycleId}
                data={data}
                record={selected}
                allowed={allowed}
                onClose={() => setSelected(undefined)}
                onSaved={() => {
                  setSelected(undefined);
                  remote.reload();
                }}
              />
            )}
            {completing && (
              <CompleteSeeding
                cycleId={cycleId}
                zoneId={zoneId}
                onClose={() => setCompleting(false)}
                onSaved={() => {
                  setCompleting(false);
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

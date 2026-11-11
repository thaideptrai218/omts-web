"use client";
import { Fragment } from "react";
import type { z } from "zod";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataTable, displayTime } from "@/features/operations/ui";
import { CagesWithEstimatedKg, KgWithApproxCages } from "./harvest-quantity-cell";
import { HarvestLotPreview } from "./harvest-lot-preview";
import type { harvestLot } from "./records-contracts";
import flowStyles from "./cultivation-flow.module.css";

export function HarvestRecordsTable({ rows, selectedLot, zoneId, statusLabel, onSelect, onSaved }: {
  rows: z.infer<typeof harvestLot>[]; selectedLot?: string; zoneId: string;
  statusLabel(value: string): string; onSelect(id?: string): void; onSaved(): void;
}) {
  return (<div className={flowStyles.harvestTable}>
              <DataTable
                responsive
                headings={[
                  "Mã lô / thời điểm",
                  "Làn thu hoạch",
                  "Số lồng thu hoạch",
                  "Đã bán",
                  "Còn để bán",
                  "Trạng thái",
                ]}
                empty={!rows.length}
              >
                {rows.map((lot) => (
                  <Fragment key={lot.id}>
                    <OpenableTableRow
                      data-selected={selectedLot === lot.id || undefined}
                      onOpen={() => onSelect(selectedLot === lot.id ? undefined : lot.id)}
                    >
                      <td data-label="Mã lô / thời điểm">
                        <button
                          type="button"
                          className={flowStyles.recordLink}
                          aria-expanded={selectedLot === lot.id}
                          onClick={() => onSelect(selectedLot === lot.id ? undefined : lot.id)}
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
                      <td data-label="Số lồng thu hoạch" className="text-right">
                        <CagesWithEstimatedKg cages={lot.cageCount} kg={lot.estimatedKg} />
                      </td>
                      <td data-label="Đã bán" className="text-right">
                        <KgWithApproxCages kg={lot.invoicedKg} kgPerCage={lot.kgPerCage} />
                      </td>
                      <td data-label="Còn để bán" className="text-right font-semibold">
                        <KgWithApproxCages kg={lot.remainingKg} kgPerCage={lot.kgPerCage} />
                      </td>
                      <td data-label="Trạng thái">
                        <span className={flowStyles.state}>{statusLabel(lot.status)}</span>

                      </td>
                    </OpenableTableRow>
                    {selectedLot === lot.id && (
                      <tr>
                        <td colSpan={6} className={flowStyles.recordDetailCell}>
                          <HarvestLotPreview
                            id={lot.id}
                            zoneId={zoneId}
                            onClose={() => onSelect(undefined)}
                            onSaved={() => {
                              onSelect(undefined);
                              onSaved();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </DataTable>
            </div>);
}

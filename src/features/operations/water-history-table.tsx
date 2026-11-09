import { Fragment } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import type * as c from "./contracts";
import { DataTable, Paging, Select, displayTime, statusLabel } from "./ui";
import { formatMeasuredValue } from "./water-measurement-shared";
import { WaterReadSummary } from "./water-read-summary";
import styles from "./water-screen.module.css";

const HISTORY_HEADINGS = ["Thời điểm / điểm đo", "pH", "Độ mặn (‰)", "Trạng thái", "Cảnh báo", "Người đo", "Chi tiết"];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

type WaterHistoryTableProps = {
  history: c.WaterHistory;
  /** `undefined` = nothing open, `null` = new-measurement draft, record = expanded row. */
  selected: c.WaterMeasurement | null | undefined;
  disabled: boolean;
  page: number;
  pageSize: number;
  onToggleRow(id: string): void;
  onFullDetail(): void;
  onPageChange(page: number): void;
  onPageSizeChange(pageSize: number): void;
};

/** Measurement history with an inline expandable summary row and paging controls. */
export function WaterHistoryTable({
  history,
  selected,
  disabled,
  page,
  pageSize,
  onToggleRow,
  onFullDetail,
  onPageChange,
  onPageSizeChange,
}: WaterHistoryTableProps) {
  return (
    <>
      <DataTable headings={HISTORY_HEADINGS} empty={!history.items.length}>
        {history.items.map((row) => {
          const isSelected = selected?.id === row.id;
          return (
            <Fragment key={row.id}>
              <OpenableTableRow data-water-selected={isSelected} disabled={disabled} onOpen={() => onToggleRow(row.id)}>
                <td>
                  <strong className="whitespace-nowrap">{displayTime(row.measuredAt)}</strong>
                  <span className={styles.point}>{row.measurementPoint ?? "Chưa ghi điểm đo"}{row.hasPhoto ? " · Có ảnh" : ""}</span>
                </td>
                <td className={styles.number}>{formatMeasuredValue(row.ph)}</td>
                <td className={styles.number}>{formatMeasuredValue(row.salinity)}</td>
                <td>
                  <span className={styles.status}>{statusLabel(row.statusCode)}</span>
                  <span className={styles.point}>Phiên bản {row.recordVersion}</span>
                </td>
                <td>
                  <span className={styles.alert} data-warning={!!row.violatedValues}>{statusLabel(row.alertState)}</span>
                  {row.violatedValues && <p className={styles.warning}>{row.violatedValues}</p>}
                </td>
                <td>{row.measuredBy?.name ?? "—"}</td>
                <td>
                  <button
                    className={styles.textButton}
                    type="button"
                    aria-expanded={isSelected}
                    aria-controls={isSelected ? "water-selected-detail" : undefined}
                    disabled={disabled}
                    onClick={() => onToggleRow(row.id)}
                  >
                    {isSelected ? "Thu gọn" : "Xem phép đo"}
                  </button>
                </td>
              </OpenableTableRow>
              {isSelected && selected && (
                <tr className={styles.detailRow}>
                  <td colSpan={7}><WaterReadSummary record={selected} onFullDetail={onFullDetail} /></td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </DataTable>
      <div className={styles.paging}>
        <Select label="Số phép đo mỗi trang" value={String(pageSize)} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} phép đo</option>)}
        </Select>
        <Paging page={page} total={history.total} pageSize={pageSize} disabled={disabled} onChange={onPageChange} />
      </div>
    </>
  );
}

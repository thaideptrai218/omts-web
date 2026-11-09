"use client";
import { Fragment, useId } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import type { ClaimRow } from "./claim-contracts";
import { claimStatus, claimTone, dateTimeText, offerLabel } from "./claim-labels";
import { StaffClaimDetail } from "./staff-claim-detail";
import s from "./claims.module.css";

type Props = { rows: readonly ClaimRow[]; expandedId?: string; canRespond: boolean; onToggle(id: string): void; onChanged(): void };
const HEADINGS = ["Mã khiếu nại", "Khách hàng", "Hóa đơn", "Thời gian gửi", "Trạng thái", "Nội dung"] as const;

/**
 * Bảng khiếu nại. Bấm vào dòng (hoặc nút mã khiếu nại, bằng bàn phím) mở chi tiết NGAY DƯỚI dòng đó theo mẫu disclosure (aria-expanded / aria-controls);
 * chỉ một dòng mở một lúc. Bảng nằm trong khung cuộn ngang nên trang không bị tràn trên màn hình hẹp.
 */
export function QualityClaimsTable({ rows, expandedId, canRespond, onToggle, onChanged }: Props) {
  const base = useId();
  return (
    <div className={s.frame}>
      <table className={s.table} aria-label="Danh sách khiếu nại chất lượng">
        <thead><tr>{HEADINGS.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => {
            const open = expandedId === row.id, panelId = `${base}-${row.id}`;
            return (
              <Fragment key={row.id}>
                <OpenableTableRow data-open={open} onOpen={() => onToggle(row.id)}>
                  <td><button type="button" className={s.rowButton} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-label={`Khiếu nại ${row.code}, ${open ? "thu gọn" : "xem chi tiết"}`} onClick={() => onToggle(row.id)}>{row.code}</button></td>
                  <td>{row.customer?.name ?? "—"}{row.customer?.phoneNumber && <span className={s.sub}>{row.customer.phoneNumber}</span>}</td>
                  <td>{row.invoice.code}</td>
                  <td>{dateTimeText(row.sentAt)}</td>
                  <td><span className={s.chip} data-tone={claimTone(row.statusId)}>{claimStatus(row.statusId)}</span>{row.offer && <span className={s.sub}>{offerLabel(row.offer)}</span>}</td>
                  <td><span className={s.clip}>{row.description}</span><span className={s.sub}>{row.photoCount} ảnh</span></td>
                </OpenableTableRow>
                {open && <tr id={panelId}><td colSpan={HEADINGS.length} className={s.detailCell}><StaffClaimDetail id={row.id} canRespond={canRespond} onChanged={onChanged} /></td></tr>}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

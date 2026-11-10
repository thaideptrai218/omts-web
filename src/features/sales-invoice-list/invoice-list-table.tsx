"use client";
import Link from "next/link";
import { Fragment, useId } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { customerHref } from "@/features/customers/customer-links";
import { InvoiceDetailPanel } from "./invoice-detail";
import type { ListRow } from "./invoice-list-contracts";
import { dateTimeText, deliveryStatus, deliveryTone, invoiceStatus, paidState, paidTone, paymentTerm, statusTone, vnd } from "./invoice-labels";
import s from "./invoice-list.module.css";

type Props = { rows: readonly ListRow[]; expandedId?: string; canExport: boolean; onToggle(id: string): void; onChanged(): void };

const HEADINGS = ["Mã hóa đơn", "Thời gian", "Vùng", "Khách hàng", "Tổng tiền", "Trạng thái", "Hình thức thanh toán", "Thanh toán", "Gửi hóa đơn"] as const;

/**
 * Bảng hóa đơn. Bấm vào dòng (hoặc nút mã hóa đơn, bằng bàn phím) mở chi tiết NGAY DƯỚI dòng đó theo mẫu disclosure (aria-expanded / aria-controls);
 * chỉ một dòng mở một lúc. Bảng nằm trong khung cuộn ngang nên trang không bị tràn trên màn hình hẹp.
 */
export function InvoiceListTable({ rows, expandedId, canExport, onToggle, onChanged }: Props) {
  const base = useId();
  return (
    <div className={s.frame}>
      <table className={s.table} aria-label="Danh sách hóa đơn bán">
        <thead><tr>{HEADINGS.map((heading, index) => <th key={heading} scope="col" className={index === 4 ? s.num : undefined}>{heading}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => {
            const open = expandedId === row.id, panelId = `${base}-${row.id}`;
            return (
              <Fragment key={row.id}>
                <OpenableTableRow data-open={open} onOpen={() => onToggle(row.id)}>
                  <td><button type="button" className={s.rowButton} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-label={`Hóa đơn ${row.code}, ${open ? "thu gọn" : "xem chi tiết"}`} onClick={() => onToggle(row.id)}>{row.code}</button></td>
                  <td>{dateTimeText(row.invoicedAt)}</td>
                  <td>{row.zone.code}<span className={s.sub}>{row.zone.name}</span></td>
                  <td>{row.customer?.code ? <Link href={customerHref(row.customer.code)}>{row.customer.name}</Link> : row.customer?.name ?? "Khách lẻ"}{row.customer?.phoneNumber && <span className={s.sub}>{row.customer.phoneNumber}</span>}</td>
                  <td className={s.num}>{vnd(row.total)}</td>
                  <td><span className={s.chip} data-tone={statusTone(row.statusId)}>{invoiceStatus(row.statusId)}</span></td>
                  <td>{paymentTerm(row.paymentTerm)}</td>
                  <td>{row.isPaid === null ? "—" : <span className={s.chip} data-tone={paidTone(row.isPaid)}>{paidState(row.isPaid)}</span>}
                    {row.isPaid === false && row.unpaidAmount > 0 && <span className={s.sub}>Còn {vnd(row.unpaidAmount)}</span>}
                    {row.cashAwaitingConfirmation != null && <span className={s.sub}>Tiền mặt chờ xác nhận {vnd(row.cashAwaitingConfirmation)}</span>}</td>
                  <td>{row.statusId === 3502 ? "—" : <span className={s.chip} data-tone={deliveryTone(row.deliveryStatusId)}>{deliveryStatus(row.deliveryStatusId)}</span>}</td>
                </OpenableTableRow>
                {open && <tr id={panelId}><td colSpan={HEADINGS.length} className={s.detailCell}><InvoiceDetailPanel id={row.id} zoneName={row.zone.code} canExport={canExport} onChanged={onChanged} /></td></tr>}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

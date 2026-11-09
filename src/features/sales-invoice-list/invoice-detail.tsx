"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { FrameTabs } from "@/features/quality-claims/frame-kit";
import q from "@/features/quality-claims/frame-kit.module.css";
import { InvoiceEditTab } from "./invoice-edit-tab";
import { InvoiceInfoTab } from "./invoice-info-tab";
import { InvoicePaymentsTab, InvoiceSendingTab } from "./invoice-payments-sending-tabs";
import { invoiceDetail, type InvoiceDetail } from "./invoice-list-contracts";
import { allowedSet, invoiceStatus, statusTone } from "./invoice-labels";
import { useInvoiceActions } from "./use-invoice-actions";
import { invoiceRepository } from "./use-invoice-list";
import s from "./invoice-list.module.css";

type Props = { id: string; zoneName: string; canExport: boolean; onChanged(): void };

/** Chi tiết một hóa đơn mở ngay dưới dòng được chọn: các tab Thông tin / Thanh toán / Gửi hóa đơn / Chỉnh sửa và các lệnh mà backend cho phép trên hóa đơn này. */
export function InvoiceDetailPanel({ id, zoneName, canExport, onChanged }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => invoiceRepository.read("detail", { id }, invoiceDetail, signal), [id]));
  const [fresh, setFresh] = useState<InvoiceDetail>();
  const invoice = fresh ?? remote.data;
  const apply = useCallback((next: InvoiceDetail) => { setFresh(next); onChanged(); }, [onChanged]);
  const actions = useInvoiceActions(id, apply);

  if (remote.loading && !invoice) return <Skeleton />;
  if (remote.error || !invoice) {
    return <div role="alert" className="py-4"><ErrorNotice error={remote.error ?? "Chưa tải được chi tiết hóa đơn."} /><Button className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại chi tiết</Button></div>;
  }
  const allowed = allowedSet(invoice.allowedActions);
  const reload = () => { setFresh(undefined); remote.reload(); onChanged(); };
  return (
    <div className={s.detailBox}>
      <div className={s.detailHead}>
        <h3>{invoice.code}</h3><span className={s.chip} data-tone={statusTone(invoice.statusId)}>{invoiceStatus(invoice.statusId)}</span>
        <span className={s.muted}>Vùng nuôi: {zoneName}</span>
      </div>
      <FrameTabs label={`Hóa đơn ${invoice.code}`} tabs={[
        { id: "info", label: "Thông tin", content: <InvoiceInfoTab invoice={invoice} /> },
        { id: "payments", label: "Thanh toán", content: <InvoicePaymentsTab invoice={invoice} /> },
        { id: "sending", label: "Gửi hóa đơn", content: <InvoiceSendingTab invoice={invoice} /> },
        { id: "edit", label: "Chỉnh sửa", content: <InvoiceEditTab invoice={invoice} allowed={allowed} onChanged={apply} onReload={reload} /> },
      ]} />
      <ErrorNotice error={actions.error} />
      {actions.notice && <p role="status" className={s.notice}>{actions.notice}</p>}
      <div className={q.footer} role="group" aria-label={`Thao tác với hóa đơn ${invoice.code}`}>
        {allowed.has("CreateReturn") && (
          // TODO(api): phiếu trả hàng bán (CLAIM-03) chưa có endpoint tạo; nút giữ ở trạng thái khóa cho tới khi backend có API và màn Phiếu trả hàng bán được nối.
          <Button className="w-auto" disabled aria-disabled="true">Tạo phiếu trả hàng bán</Button>
        )}
        {allowed.has("Resend") && <Button className="w-auto" variant="secondary" isPending={actions.resending} disabled={actions.blocked || actions.resending} onClick={() => void actions.resend()}>Gửi lại</Button>}
        {allowed.has("Print") && canExport && <Button className="w-auto" variant="secondary" isPending={actions.printing} disabled={actions.printing} onClick={actions.print}>In</Button>}
      </div>
    </div>
  );
}

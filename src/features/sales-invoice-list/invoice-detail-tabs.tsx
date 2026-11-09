"use client";
// FRAME ONLY: no data source yet. Wire to the sales-invoice detail, payments, delivery log and adjustment history endpoints once available.
import { Button } from "@/components/ui/button";
import { FrameTable, FrameTabs, KeyValues, NO_VALUE } from "@/features/quality-claims/frame-kit";
import s from "@/features/quality-claims/frame-kit.module.css";

function Actions({ resend, label }: { resend: boolean; label: string }) {
  return (
    <div className={s.footer} role="group" aria-label={label}>
      {/* TODO(api): create sales return (navigate to the return screen), resend invoice, print invoice. Enable per invoice status and permission. */}
      <Button className="w-auto" disabled aria-disabled="true">Tạo phiếu trả hàng bán</Button>
      {resend && <Button variant="secondary" className="w-auto" disabled aria-disabled="true">Gửi lại</Button>}
      <Button variant="secondary" className="w-auto" disabled aria-disabled="true">In</Button>
    </div>
  );
}

function InfoTab() {
  return (
    <>
      {/* TODO(api): invoice header + lines + totals from the invoice detail. */}
      <KeyValues items={["Thời gian", "Khách hàng", "Số điện thoại", "Hình thức thanh toán"]} />
      <FrameTable label="Dòng hàng của hóa đơn" headings={["Sản phẩm", "Lô thu hoạch", "kg", "Đơn giá", "Nguồn giá", "Thành tiền"]} numeric={[2, 3, 5]} />
      <dl className={s.kv} aria-label="Tổng hợp hóa đơn">
        {["Giảm giá", "Thu khác", "Giảm giá sau khiếu nại", "Tổng cộng"].map((l) => <div key={l}><dt>{l}</dt><dd>{NO_VALUE}</dd></div>)}
      </dl>
      <Actions resend label="Thao tác với hóa đơn" />
    </>
  );
}

function TableTab({ label, headings, resend, numeric }: { label: string; headings: readonly string[]; resend: boolean; numeric?: readonly number[] }) {
  return <><FrameTable label={label} headings={headings} numeric={numeric} /><Actions resend={resend} label={`Thao tác — ${label}`} /></>;
}

/** Khu chi tiết một hóa đơn với 4 tab: Thông tin, Thanh toán, Gửi hóa đơn, Chỉnh sửa. */
export function InvoiceDetailTabs() {
  return (
    <FrameTabs label="Chi tiết hóa đơn" tabs={[
      { id: "info", label: "Thông tin", content: <InfoTab /> },
      { id: "payments", label: "Thanh toán", content: <TableTab label="Thanh toán của hóa đơn" headings={["Hình thức", "Số tiền (đ)", "Thời gian", "Trạng thái"]} numeric={[1]} resend /> },
      { id: "delivery", label: "Gửi hóa đơn", content: <TableTab label="Lịch sử gửi hóa đơn" headings={["Thời gian", "Kênh", "Trạng thái gửi"]} resend={false} /> },
      { id: "edits", label: "Chỉnh sửa", content: <TableTab label="Lịch sử chỉnh sửa hóa đơn" headings={["Thời gian", "Loại sửa", "Lý do", "Tổng trước → sau"]} resend numeric={[3]} /> },
    ]} />
  );
}

"use client";
// FRAME ONLY: no data source yet. Wire to the sales-return create endpoint plus the invoice, its quality claims and customer debt lookups once available.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FrameCard, FrameTable, KeyValues, NO_VALUE } from "@/features/quality-claims/frame-kit";
import s from "@/features/quality-claims/frame-kit.module.css";
import { Note, OperationHeading } from "@/features/operations/ui";
import { SalesReturnConfirmDialog } from "./sales-return-confirm-dialog";

const CLAIM_HEADINGS = ["Mã", "Ngày gửi", "Mô tả", "Trạng thái"] as const;
const LINE_HEADINGS = ["Sản phẩm", "Lô thu hoạch", "Trạng thái lô", "kg", "Đơn giá", "Thành tiền", "Hàu trả lại được xử lý"] as const;

function ValueSummary() {
  return (
    <FrameCard title="Giá trị phiếu trả và công nợ">
      {/* TODO(api): compute return value and customer debt after the return from the server; never from the client. */}
      <dl className={s.kv}>
        {["Giá trị phiếu trả hàng", "Công nợ hiện tại của khách", "Công nợ sau phiếu trả"].map((label) => <div key={label}><dt>{label}</dt><dd>{NO_VALUE}</dd></div>)}
      </dl>
    </FrameCard>
  );
}

/** SCR-CLAIM-03 Phiếu trả hàng bán: trả toàn bộ hóa đơn, chọn xử lý hàu từng lô, nhập lý do rồi xác nhận. */
export function SalesReturnsScreen() {
  // Local UI state only: reason text and the confirm dialog visibility.
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  return (
    <section>
      <OperationHeading title="Phiếu trả hàng bán" description="Trả lại toàn bộ hàng của một hóa đơn, chọn bán lại hoặc hủy bỏ cho từng lô; mã phiếu được cấp khi lưu." icon="receipt" />
      <div className={`${s.twoCol} ${s.asideRight}`}>
        <div className={s.stack}>
          <FrameCard title="Hóa đơn">
            {/* TODO(api): load invoice header (customer, time, zone, current total). */}
            <KeyValues items={["Khách hàng", "Ngày hóa đơn", "Vùng nuôi", "Tổng tiền (giá trị hiện tại)"]} />
          </FrameCard>
          <FrameCard title="Khiếu nại chất lượng của hóa đơn">
            {/* TODO(api): list the quality claims of this invoice. */}
            <FrameTable label="Khiếu nại của hóa đơn" headings={CLAIM_HEADINGS} />
          </FrameCard>
          <FrameCard title="Dòng hàng trả lại (toàn bộ hóa đơn, không trả một phần)">
            {/* TODO(api): lines with lot status and per-lot "Bán lại" / "Hủy bỏ" choice. */}
            <FrameTable label="Dòng hàng trả lại" headings={LINE_HEADINGS} numeric={[3, 4, 5]} />
            <p className={s.hint}>Chọn theo quyết định của chủ hợp tác xã sau khi bạn kiểm tra hàu trả lại.</p>
          </FrameCard>
          <FrameCard title="Lý do">
            <Note label="Lý do trả hàng *" required aria-required="true" value={reason} onChange={(event) => setReason(event.target.value)} />
          </FrameCard>
        </div>
        <div className={s.stack}>
          <ValueSummary />
          {/* TODO(api): the save action creates the slip after the confirm dialog; keep the amount-owed-to-customer notice (negative debt) server-driven. */}
          <Button onClick={() => setConfirming(true)}>Lưu phiếu trả hàng</Button>
        </div>
      </div>
      <SalesReturnConfirmDialog open={confirming} onClose={() => setConfirming(false)} />
    </section>
  );
}

"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the payroll sheet detail endpoints
 * (sheet info, payslip lines, labor cost per raft, payroll payment history, send-to-owner, cash export)
 * once available. Tabs follow the wireframe: Thông tin, Phiếu lương, Chi phí nhân công, Lịch sử thanh toán.
 */
import { Button } from "@/components/ui/button";
import { FrameTable } from "@/features/sales-reports/frame-parts";
import { PayrollTabs, type PayrollTab } from "./payroll-tabs";
import type { PayrollDialogKind } from "./payroll-dialogs";
import s from "./payroll-frame.module.css";

const FACTS = ["Tạo bởi", "Tổng lương (₫)", "Gửi lúc", "Chốt lúc", "Tổng đã trả (₫)", "Còn nợ (₫)"] as const;
const SLIP_HEADINGS = ["Nhân viên", "Loại nhân viên", "Giờ theo từng công việc × đơn giá = tiền", "Cộng (₫)", "Điều chỉnh (₫) và lý do", "Lương (₫)"];
const COST_HEADINGS = ["Bè", "Vùng nuôi", "Chu kỳ nuôi", "Chi phí nhân công (₫)"];
const PAYMENT_HEADINGS = ["Mã phiếu chi", "Nhân viên", "Ngày thanh toán", "Số tiền (₫)", "Phương thức", "Trạng thái"];

type Open = (kind: PayrollDialogKind) => void;

function AddLineButton({ onOpen }: Readonly<{ onOpen: Open }>) {
  return <Button variant="secondary" className="w-auto" onClick={() => onOpen("add-line")}>+ Thêm dòng điều chỉnh</Button>;
}

function SendButton() {
  // TODO(api): send the payroll sheet to the cooperative owner; blocked while attendance is incomplete or rates are missing.
  return <Button className="w-auto" disabled aria-disabled="true">Gửi cho chủ hợp tác xã</Button>;
}

function InfoTab({ onOpen }: Readonly<{ onOpen: Open }>) {
  return (
    <>
      <dl className={s.facts}>{FACTS.map((fact) => <div key={fact}><dt>{fact}</dt><dd>—</dd></div>)}</dl>
      {/* TODO(api): blockers that prevent sending the sheet (incomplete attendance, hours without a rate). */}
      <div className={s.checks}>
        <div><h4>Chấm công chưa hoàn tất</h4><p className={s.muted}>—</p></div>
        <div><h4>Giờ chưa có đơn giá</h4><p className={s.muted}>—</p></div>
      </div>
      <div className={s.actions}><span /><div><SendButton /><AddLineButton onOpen={onOpen} /></div></div>
    </>
  );
}

function SlipsTab({ onOpen }: Readonly<{ onOpen: Open }>) {
  return (
    <>
      {/* TODO(api): one payslip row per employee; the adjustment cell opens the adjust dialog for that row. */}
      <FrameTable caption="Phiếu lương" headings={SLIP_HEADINGS} rightAligned={[3, 5]} />
      <div className={s.actions}>
        <Button variant="secondary" className="w-auto" onClick={() => onOpen("adjust")}>Điều chỉnh dòng lương</Button>
        <div><SendButton /><AddLineButton onOpen={onOpen} /></div>
      </div>
    </>
  );
}

function CostTab({ onOpen }: Readonly<{ onOpen: Open }>) {
  return (
    <>
      {/* TODO(api): labor cost per raft and farming cycle for the period. */}
      <FrameTable caption="Chi phí nhân công theo bè" headings={COST_HEADINGS} rightAligned={[3]} />
      <div className={s.actions}><span /><div><SendButton /><AddLineButton onOpen={onOpen} /></div></div>
    </>
  );
}

function PaymentsTab({ onOpen }: Readonly<{ onOpen: Open }>) {
  return (
    <>
      <h3 className={s.sub}>Phiếu chi lương của bảng lương này</h3>
      {/* TODO(api): payroll payment vouchers of the sheet; voucher code opens the cancel dialog. */}
      <FrameTable caption="Phiếu chi lương" headings={PAYMENT_HEADINGS} rightAligned={[3]} />
      <div className={s.actions}>
        <div>
          {/* TODO(api): download the cash payout list of the sheet. */}
          <Button variant="secondary" className="w-auto" disabled aria-disabled="true">Tải danh sách chi tiền mặt</Button>
          <Button variant="secondary" className="w-auto" onClick={() => onOpen("cancel-payment")}>Hủy thanh toán</Button>
        </div>
        {/* TODO(api): open the payroll payment screen (SCR-LABOR-11) for this sheet. */}
        {/* TODO(api): chỉ bật khi bảng lương đang chọn ở trạng thái Đã chốt còn khoản chưa trả; mở /operations/payroll-payments của đúng bảng lương (SCR-LABOR-11). */}
        <Button className="w-auto" disabled aria-disabled="true">Thanh toán lương</Button>
      </div>
    </>
  );
}

/** Selected payroll sheet detail: heading plus the four tabs of the wireframe. */
export function PayrollDetailPanel({ onOpen }: Readonly<{ onOpen: Open }>) {
  const tabs: readonly PayrollTab[] = [
    { id: "info", label: "Thông tin", content: <InfoTab onOpen={onOpen} /> },
    { id: "slips", label: "Phiếu lương", content: <SlipsTab onOpen={onOpen} /> },
    { id: "labor-cost", label: "Chi phí nhân công", content: <CostTab onOpen={onOpen} /> },
    { id: "payments", label: "Lịch sử thanh toán", content: <PaymentsTab onOpen={onOpen} /> },
  ];
  return (
    <section className={s.card} aria-labelledby="payroll-detail-title">
      <div className={s.cardHead}><h2 id="payroll-detail-title">Bảng lương —</h2><span className={s.muted}>Kỳ lương —</span></div>
      <PayrollTabs label="Chi tiết bảng lương" tabs={tabs} />
    </section>
  );
}

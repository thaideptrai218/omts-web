"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the payroll sheet list / create / detail endpoints
 * (status filter, period search, paging) once available. SCR-LABOR-10 "Bảng lương".
 * Layout shell: no fetch, no mock data.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { OperationHeading, Field } from "@/features/operations/ui";
import { FrameTable } from "@/features/sales-reports/frame-parts";
import { PayrollCancelPaymentDialog } from "./payroll-cancel-payment-dialog";
import { PayrollDetailPanel } from "./payroll-detail-panel";
import { PayrollSheetDialogs, type PayrollDialogKind } from "./payroll-dialogs";
import s from "./payroll-frame.module.css";

const STATUSES = [
  { value: "draft", label: "Nháp", tone: s.pillDraft },
  { value: "pending", label: "Chờ chốt", tone: s.pillPending },
  { value: "returned", label: "Đã trả lại", tone: s.pillReturned },
  { value: "final", label: "Đã chốt", tone: s.pillFinal },
] as const;

const HEADINGS = ["Kỳ lương", "Từ ngày – đến ngày", "Trạng thái", "Tổng lương (₫)", "Thanh toán lương"];

export function PayrollScreen() {
  const [dialog, setDialog] = useState<PayrollDialogKind | null>(null);
  const [statuses, setStatuses] = useState<readonly string[]>(STATUSES.map((status) => status.value));
  const toggle = (value: string) => setStatuses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const close = () => setDialog(null);

  return (
    <section>
      <OperationHeading title="Bảng lương" description="Lập bảng lương theo kỳ từ chấm công, điều chỉnh từng dòng, gửi chủ hợp tác xã chốt và theo dõi thanh toán lương." icon="payment">
        <Button className="w-auto" variant="secondary" onClick={() => setDialog("create")}>+ Tạo bảng lương</Button>
      </OperationHeading>
      <FilterWorkspace
        label="Bộ lọc bảng lương"
        filters={
          <form className={s.form} onSubmit={(event) => event.preventDefault()}>
            {/* TODO(api): status filter values feed the payroll sheet list query. */}
            <fieldset className={s.group}>
              <legend>Trạng thái</legend>
              {STATUSES.map((status) => (
                <label key={status.value} className={s.check}>
                  <input type="checkbox" checked={statuses.includes(status.value)} onChange={() => toggle(status.value)} />
                  <span className={`${s.pill} ${status.tone}`}>{status.label}</span>
                </label>
              ))}
            </fieldset>
          </form>
        }
      >
        <div className={s.stack}>
          {/* TODO(api): search by pay period; filters the sheet list. */}
          <Field type="search" label="Theo kỳ lương" placeholder="Theo kỳ lương" autoComplete="off" />
          {/* TODO(api): sheet rows (newest first). Khi có dữ liệu, chi tiết phải bung ngay dưới đúng dòng được chọn (cùng mẫu với phiếu nhập hàng và nhà cung cấp), không để ở khối riêng bên dưới bảng. */}
          <FrameTable caption="Danh sách bảng lương theo kỳ" headings={HEADINGS} rightAligned={[3]} />
          <PayrollDetailPanel onOpen={setDialog} />
        </div>
      </FilterWorkspace>
      {dialog === "cancel-payment" ? <PayrollCancelPaymentDialog onClose={close} /> : <PayrollSheetDialogs kind={dialog} onClose={close} />}
    </section>
  );
}

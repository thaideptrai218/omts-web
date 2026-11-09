"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the payroll sheet create / adjust-line / add-line
 * endpoints once available. Forms are drawn as in the wireframe; confirm buttons stay disabled.
 */
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Note, Select } from "@/features/operations/ui";
import s from "./payroll-frame.module.css";

export type PayrollDialogKind = "create" | "adjust" | "add-line" | "cancel-payment";

/** Dialog footer: working "Bỏ qua" and a disabled confirm button (needs the API). */
export function PayrollDialogFooter({ onClose, confirmLabel, danger = false }: Readonly<{ onClose(): void; confirmLabel: string; danger?: boolean }>) {
  return (
    <div className={s.dialogFoot}>
      <Button variant="secondary" className="w-auto" onClick={onClose}>Bỏ qua</Button>
      {/* TODO(api): enable and submit once the endpoint exists. */}
      <Button variant={danger ? "danger" : "primary"} className="w-auto" disabled aria-disabled="true">{confirmLabel}</Button>
    </div>
  );
}

const noSubmit = (event: React.FormEvent) => event.preventDefault();

function CreateSheetDialog({ onClose }: Readonly<{ onClose(): void }>) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title="Tạo bảng lương">
      <form className={s.dialogForm} onSubmit={noSubmit}>
        {/* TODO(api): options = pay periods that have no payroll sheet yet. */}
        <Select label="Kỳ lương *" required defaultValue="" data-dialog-initial-focus>
          <option value="">Chưa có dữ liệu để hiển thị.</option>
        </Select>
        <p className={s.muted}>Chỉ chọn được kỳ lương chưa có bảng lương. Các dòng được tính từ chấm công của kỳ.</p>
        <PayrollDialogFooter onClose={onClose} confirmLabel="Tạo bảng lương" />
      </form>
    </Dialog>
  );
}

function AdjustLineDialog({ onClose }: Readonly<{ onClose(): void }>) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title="Điều chỉnh dòng lương">
      <form className={s.dialogForm} onSubmit={noSubmit}>
        {/* TODO(api): employee name, line total and the recalculated total come from the selected payroll line. */}
        <p className={s.line}><span>Cộng của dòng (từ chấm công)</span><span>— ₫</span></p>
        <Field label="Số tiền điều chỉnh (₫, dấu + là cộng thêm, dấu – là trừ bớt) *" required inputMode="numeric" autoComplete="off" data-dialog-initial-focus />
        <Note label="Lý do (nêu ngày hoặc bảng lương được sửa) *" required />
        <p className={s.lineStrong}><span>Lương của dòng sau điều chỉnh</span><span>— ₫</span></p>
        <PayrollDialogFooter onClose={onClose} confirmLabel="Lưu điều chỉnh" />
      </form>
    </Dialog>
  );
}

function AddAdjustmentLineDialog({ onClose }: Readonly<{ onClose(): void }>) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title="Thêm dòng điều chỉnh">
      <form className={s.dialogForm} onSubmit={noSubmit}>
        {/* TODO(api): options = employees that have no line in this payroll sheet (including former employees). */}
        <Select label="Nhân viên (chưa có dòng trong bảng lương này) *" required defaultValue="" data-dialog-initial-focus>
          <option value="">Chưa có dữ liệu để hiển thị.</option>
        </Select>
        <p className={s.muted}>Dòng mới chỉ giữ khoản điều chỉnh, không có giờ làm.</p>
        <Field label="Số tiền điều chỉnh (₫) *" required inputMode="numeric" autoComplete="off" />
        <Note label="Lý do *" required />
        <PayrollDialogFooter onClose={onClose} confirmLabel="Thêm dòng" />
      </form>
    </Dialog>
  );
}

/** Renders the dialog that matches `kind`; the cancel-payment dialog lives in its own file. */
export function PayrollSheetDialogs({ kind, onClose }: Readonly<{ kind: Exclude<PayrollDialogKind, "cancel-payment"> | null; onClose(): void }>) {
  if (kind === "create") return <CreateSheetDialog onClose={onClose} />;
  if (kind === "adjust") return <AdjustLineDialog onClose={onClose} />;
  if (kind === "add-line") return <AddAdjustmentLineDialog onClose={onClose} />;
  return null;
}

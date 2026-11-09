"use client";
import { Button } from "@/components/ui/button";
import type { Preview } from "./correction-contracts";
import { fieldLabel, formatValue } from "./trace-format";
import s from "./lot-tracing.module.css";

export type DiffRow = { label: string; before: string; after: string };

/** Hàng so sánh lấy từ phần xem trước của backend: chỉ các trường backend báo là đổi. */
export function previewRows(preview: Preview): DiffRow[] {
  return preview.changedFields.map((name) => ({ label: fieldLabel(name), before: formatValue(name, preview.before[name]), after: formatValue(name, preview.after?.[name]) }));
}

type Props = { rows: DiffRow[]; preview: Preview; pending: boolean; error?: string; onBack(): void; onConfirm(): void };

/** Bước xác nhận (SCR-TRACE-02): giá trị trước/sau, lô bị ảnh hưởng và câu hỏi phù hợp với người sửa. */
export function CorrectionConfirmStep({ rows, preview, pending, error, onBack, onConfirm }: Props) {
  const manager = preview.needsOwnerApproval;
  return (
    <div>
      <h3 className={s.h3}>Giá trị trước và sau khi sửa</h3>
      {rows.length ? (
        <table className={s.table}>
          <thead><tr><th scope="col">Trường</th><th scope="col">Trước</th><th scope="col">Sau</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.before}</td><td><strong>{row.after}</strong></td></tr>)}</tbody>
        </table>
      ) : <p className={s.hint}>Không có giá trị nào thay đổi, nên chưa thể lưu.</p>}
      {preview.affectedLots.length > 0 && <p className={s.hint}>Thông tin nguồn gốc của lô thay đổi: <strong>{preview.affectedLots.map((lot) => lot.lotCode).join(", ")}</strong>.</p>}
      {preview.affectedPublishedLotCodes.length > 0 && (
        <p className={s.warn} role="note">Lô đã công bố {preview.affectedPublishedLotCodes.join(", ")} sẽ hiển thị dữ liệu đã sửa trên trang nguồn gốc ngay sau khi lưu.</p>
      )}
      {rows.length > 0 && <p className={s.question}>{manager ? "Chủ hợp tác xã đã đồng ý trực tiếp rằng dữ liệu hiện tại là sai và cần sửa?" : "Bạn xác nhận sửa dữ liệu truy xuất này?"}</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      <div className={s.dialogActions}>
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={onBack}>Quay lại chỉnh sửa</Button>
        <Button className="w-auto" disabled={!rows.length} isPending={pending} pendingLabel="Đang lưu..." onClick={onConfirm}>{manager ? "Chủ HTX đã đồng ý, lưu" : "Xác nhận lưu"}</Button>
      </div>
    </div>
  );
}

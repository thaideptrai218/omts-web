"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import cashStyles from "@/features/cash-book/cash-book.module.css";
import { percentText, type VatRateRow } from "@/features/input-items/vat-rate";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { DeactivateDialog, RateDialog } from "./vat-rate-dialogs";
import { vatRateError, vatRateRepository } from "./repository";
import styles from "./vat-rate-settings.module.css";

const readers = ["PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "CULTIVATION_CYCLES", "INPUT_ISSUES"];

/**
 * Thiết lập → Thuế GTGT: the VAT rates of the cooperative that supply items and purchase lines pick from. Only the Owner changes them; everyone who reads items or
 * receipts sees the list. KCT is the system rate and never changes.
 */
export function VatRateSettingsPanel() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner";
  const canRead = owner || permissions.functionPermissions.some((p) => readers.includes(p.functionCode) && p.action === "View");
  const rates = useRemote(useCallback((signal: AbortSignal) => canRead ? vatRateRepository.list(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canRead]));
  const [editing, setEditing] = useState<VatRateRow | "new">(), [deactivating, setDeactivating] = useState<VatRateRow>(), [failure, setFailure] = useState<string>(), [busy, setBusy] = useState(false);
  const confirmation = useActionDialog(), { notify } = useToast();
  if (!canRead) return <p role="alert">Bạn không có quyền xem thiết lập này.</p>;
  if (rates.loading) return <Skeleton />;
  if (rates.error || !rates.data) return <ListStateMessage error={rates.error ?? "Không tải được danh sách mức thuế."} onRetry={rates.reload} />;
  const rows = rates.data;

  async function run(action: () => ReturnType<typeof vatRateRepository.setDefault>, done: string) {
    setFailure(undefined); setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.status === "success") { notify({ tone: "success", title: done }); rates.reload(); } else setFailure(vatRateError(result));
  }
  async function toggle(rate: VatRateRow, on: boolean) {
    setFailure(undefined);
    if (on) { await run(() => vatRateRepository.activate(rate.id), `Đã dùng lại mức thuế ${rate.name}.`); return; }
    if (rate.isDefault) { setFailure(`${rate.name} đang là mức mặc định cho vật tư mới nên chưa ngừng dùng được. Hãy đặt mức khác làm mặc định trước.`); return; }
    if (rate.itemCount > 0) { setDeactivating(rate); return; }
    if (!(await confirmation.confirm(`Ngừng dùng mức thuế ${rate.name}?`))) return;
    await run(async () => {
      const result = await vatRateRepository.deactivate(rate.id, { rowVersion: rate.rowVersion });
      return result.status === "success" ? { status: "success" as const, data: result.data.rate } : result;
    }, `Đã ngừng dùng mức thuế ${rate.name}.`);
  }
  const colSpan = 6 - (owner ? 0 : 1);
  return <div className={managementStyles.theme}>
    {confirmation.dialog}
    {owner && <div className={cashStyles.toolbar}><Button className="w-auto" variant="secondary" onClick={() => { setFailure(undefined); setEditing("new"); }}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm mức thuế</Button></div>}
    <ErrorNotice error={failure} />
    <div className={cashStyles.tableWrap}><table className={cashStyles.table}>
      <thead><tr><th>Tên</th><th>Thuế suất</th><th>Mặc định cho vật tư mới</th><th>Số mặt hàng</th><th>Đang dùng</th>{owner && <th className={cashStyles.actions}>Thao tác</th>}</tr></thead>
      <tbody>{rows.map((rate) => <tr key={rate.id}>
        <td className={rate.active ? undefined : cashStyles.muted}>{rate.name}{rate.isSystem && <span className={cashStyles.badge}>Hệ thống</span>}</td>
        <td className={styles.num}>{rate.isExempt ? "Không chịu thuế" : percentText(rate.percent)}</td>
        <td>{rate.isDefault ? "Mặc định" : ""}</td>
        <td>{rate.itemCount}</td>
        <td>{rate.isSystem ? <span className={cashStyles.muted}>Luôn dùng</span> : owner
          ? <Switch aria-label={`Đang dùng ${rate.name}`} checked={rate.active} disabled={busy} onChange={(event) => void toggle(rate, event.target.checked)} />
          : <span className={rate.active ? undefined : cashStyles.muted}>{rate.active ? "Đang dùng" : "Ngừng dùng"}</span>}</td>
        {owner && <td className={cashStyles.actions}>
          {!rate.isSystem && <>
            <button type="button" className={`${managementStyles.linkButton} ${styles.rowAction}`} aria-label={`Sửa ${rate.name}`} onClick={() => { setFailure(undefined); setEditing(rate); }}>Sửa</button>
            {rate.active && !rate.isDefault && <button type="button" className={`${managementStyles.linkButton} ${styles.rowAction}`} aria-label={`Đặt ${rate.name} làm mặc định`} disabled={busy}
              onClick={() => void run(() => vatRateRepository.setDefault(rate.id), `Đã đặt ${rate.name} làm mức mặc định cho vật tư mới.`)}>Đặt làm mặc định</button>}
          </>}
        </td>}
      </tr>)}
        {!rows.length && <tr><td colSpan={colSpan} className={cashStyles.muted}>Chưa có mức thuế nào.</td></tr>}</tbody>
    </table></div>
    <p className={`${cashStyles.muted} ${cashStyles.after}`}>{owner
      ? "KCT do hệ thống cấp nên không sửa hoặc tắt được; giống luôn dùng KCT. Mức mặc định là mức vật tư mới tạo bắt đầu với."
      : "Chỉ Chủ hợp tác xã thêm, sửa hoặc tắt được mức thuế."}</p>
    {editing && <RateDialog rate={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)}
      onSaved={(saved, changedPercent) => { setEditing(undefined); notify({ tone: "success", title: editing === "new" ? `Đã thêm mức thuế ${saved.name}.` : `Đã lưu mức thuế ${saved.name}.`, ...(changedPercent ? { description: "Thuế suất mới áp dụng cho phiếu tạo sau." } : {}) }); rates.reload(); }} />}
    {deactivating && <DeactivateDialog rate={deactivating} others={rows.filter((row) => row.active && row.id !== deactivating.id)} onClose={() => setDeactivating(undefined)}
      onDone={({ rate, movedItems, replacement }) => { setDeactivating(undefined); notify({ tone: "success", title: `Đã ngừng dùng mức thuế ${rate.name}.`, description: movedItems ? `Đã chuyển ${movedItems} mặt hàng sang ${replacement.name}.` : undefined }); rates.reload(); }} />}
  </div>;
}

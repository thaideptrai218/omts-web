"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, ErrorNotice, useMutation } from "@/features/operations/ui";
import { pushPatch, type PushCatalog } from "./push-contract";
import { createPersonalRepository } from "./repository";
const labels: Record<string, string> = { WATER_ALERT: "Cảnh báo nước", WATER_ALERT_WITHDRAWN: "Thu hồi cảnh báo nước",
  WATER_MEASUREMENT_OVERDUE: "Nhắc đo nước", ZONE_LICENSE_EXPIRY: "Nhắc hạn giấy phép vùng",
  WORK_ASSIGNMENT: "Phân công công việc", NEW_ORDER: "Yêu cầu mua mới", TRADER_ACCESS_REQUESTED: "Yêu cầu tài khoản thương lái",
  TRADER_ACCESS_APPROVED: "Duyệt tài khoản thương lái", PURCHASE_REQUEST_RESPONDED: "Phản hồi yêu cầu mua",
  PURCHASE_REQUEST_CANCELLED: "Hủy yêu cầu mua", EMPLOYEE_LEAVE_REQUESTED: "Yêu cầu nghỉ phép", EMPLOYEE_LEAVE_REVIEWED: "Kết quả nghỉ phép" };
const selections = (catalog: PushCatalog) => Object.fromEntries(catalog.types.map((row) => [row.type, row.push]));
Object.assign(labels, { COOPERATIVE_CERTIFICATION_EXPIRY: "Nhắc hạn chứng nhận HTX", STAFF_ACCOUNT_LOCK_REMINDER: "Nhắc kiểm tra tài khoản nhân viên", CULTIVATION_LOG_RECORDED: "Nhật ký nuôi mới", CYCLE_SEEDING_COMPLETED: "Hoàn thành thả giống", HARVEST_LOT_RECORDED: "Lô thu hoạch mới", CYCLE_CLOSE_REMINDER: "Nhắc đóng chu kỳ nuôi", PURCHASE_RECEIPT_COMPLETED: "Phiếu nhập hoàn thành", PURCHASE_RECEIPT_CANCELLED_ADVANCE: "Khoản trả trước sau hủy phiếu", SUPPLIER_TRANSACTION: "Giao dịch nhà cung cấp" });
export function PushApiEditor({ initial, onClose, inline = false }: { initial: PushCatalog; onClose(): void; inline?: boolean }) {
  const repository = useMemo(() => createPersonalRepository(), []), mutation = useMutation();
  const [catalog, setCatalog] = useState(initial), [values, setValues] = useState(() => selections(initial));
  const [notice, setNotice] = useState<string>(), [discard, setDiscard] = useState(false), [latest, setLatest] = useState<PushCatalog>();
  const patch = pushPatch(catalog, values), dirty = patch.length > 0;
  const blocked = mutation.blocked || latest !== undefined;
  function close() { if (mutation.busy()) return; if (dirty) setDiscard(true); else onClose(); }
  return <PreferenceFrame inline={inline} title={discard ? "Bỏ thay đổi thông báo?" : "Tùy chọn thông báo"} pending={mutation.pending} onClose={close}>
    {discard ? <div className="space-y-4"><p>Các lựa chọn chưa lưu sẽ bị bỏ.</p><Button onClick={() => { setValues(selections(catalog)); setDiscard(false); onClose(); }}>Bỏ thay đổi và đóng</Button><Button variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button></div> : <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); if (mutation.busy() || blocked || !dirty) return; setNotice(undefined);
      const saved = await mutation.run(() => repository.savePush(patch));
      if (saved) { setCatalog(saved); setValues(selections(saved)); setNotice(saved.notice ?? "Đã lưu tùy chọn thông báo."); }
    }}>
      <p>Mọi thông báo đều được lưu trong hộp thư. Chọn những loại bạn muốn nhận thêm qua thông báo đẩy.</p>
      {!catalog.pushAllowedOnDevice && <p>Chưa có thiết bị cho phép nhận thông báo đẩy. Bạn vẫn có thể lưu lựa chọn.</p>}
      <ErrorNotice error={mutation.error} />{notice && <p role="status">{notice}</p>}
      {!catalog.types.length && <p>Chưa có tùy chọn dành cho tài khoản này.</p>}
      <DataTable headings={["Loại thông báo", "Nhận thông báo đẩy", "Quy tắc"]} empty={!catalog.types.length}>{catalog.types.map(row => <tr key={row.type}><td className="font-medium">{labels[row.type] ?? row.name}</td><td><label className="inline-flex min-h-10 cursor-pointer items-center gap-3"><input aria-label={labels[row.type] ?? row.name} type="checkbox" className="peer sr-only" checked={values[row.type] ?? row.push} disabled={row.mandatory || blocked || mutation.pending} onChange={event => { setValues({ ...values, [row.type]: event.target.checked }); setNotice(undefined); }} /><span aria-hidden="true" className="relative h-6 w-10 rounded-full bg-border-strong/50 transition peer-checked:bg-primary peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" /><span className="text-sm">{row.mandatory ? "Luôn bật" : (values[row.type] ?? row.push) ? "Bật" : "Tắt"}</span></label></td><td className="text-xs text-text-muted">{row.mandatory ? "Bắt buộc, không thể tắt" : "Theo lựa chọn của bạn"}</td></tr>)}</DataTable>
      {(mutation.error || blocked) && <div className="space-y-3"><Button variant="secondary" disabled={mutation.pending} onClick={async () => {
        const next = await mutation.run(() => repository.notifications(), true); if (next && !Array.isArray(next)) setLatest(next);
      }}>Tải thiết lập hiện tại để đối chiếu</Button>{latest && <><ul>{latest.types.map((row) => <li key={row.type}>{labels[row.type] ?? row.name}: {row.push ? "Bật" : "Tắt"}</li>)}</ul>
        {mutation.uncertain ? <p>Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại tùy chọn trước khi thực hiện lượt mới.</p>
          : <Button variant="secondary" onClick={() => { setCatalog(latest); setValues(selections(latest)); setLatest(undefined); mutation.reviewed(); }}>Dùng thiết lập đã lưu</Button>}</>}</div>}
      <div className="flex gap-3"><Button type="submit" disabled={!dirty || blocked} isPending={mutation.pending}>Lưu tùy chọn</Button><Button variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button></div>
    </form>}
  </PreferenceFrame>;
}
function PreferenceFrame({ inline, title, pending, onClose, children }: { inline: boolean; title: string; pending: boolean; onClose(): void; children: ReactNode }) {
  if (inline) return <section aria-label={title} className="max-w-5xl"><header className="mb-5"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-text-muted">Hộp thư luôn lưu mọi thông báo. Các lựa chọn bên dưới chỉ áp dụng cho thông báo đẩy.</p></header>{children}</section>;
  return <Dialog open size="lg" title={title} dismissible={!pending} onOpenChange={open => { if (!open) onClose(); }}>{children}</Dialog>;
}

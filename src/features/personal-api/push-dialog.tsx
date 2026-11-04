"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import { pushPatch, type PushCatalog } from "./push-contract";
import { createPersonalRepository } from "./repository";
const labels: Record<string, string> = { WATER_ALERT: "Cảnh báo nước", WATER_ALERT_WITHDRAWN: "Thu hồi cảnh báo nước",
  WATER_MEASUREMENT_OVERDUE: "Nhắc đo nước", ZONE_LICENSE_EXPIRY: "Nhắc hạn giấy phép vùng",
  WORK_ASSIGNMENT: "Phân công công việc", NEW_ORDER: "Yêu cầu mua mới", TRADER_ACCESS_REQUESTED: "Yêu cầu tài khoản thương lái",
  TRADER_ACCESS_APPROVED: "Duyệt tài khoản thương lái", PURCHASE_REQUEST_RESPONDED: "Phản hồi yêu cầu mua",
  PURCHASE_REQUEST_CANCELLED: "Hủy yêu cầu mua", EMPLOYEE_LEAVE_REQUESTED: "Yêu cầu nghỉ phép", EMPLOYEE_LEAVE_REVIEWED: "Kết quả nghỉ phép" };
const selections = (catalog: PushCatalog) => Object.fromEntries(catalog.types.map((row) => [row.type, row.push]));
export function PushApiEditor({ initial, onClose }: { initial: PushCatalog; onClose(): void }) {
  const repository = useMemo(() => createPersonalRepository(), []), mutation = useMutation();
  const [catalog, setCatalog] = useState(initial), [values, setValues] = useState(() => selections(initial));
  const [notice, setNotice] = useState<string>(), [discard, setDiscard] = useState(false), [latest, setLatest] = useState<PushCatalog>();
  const patch = pushPatch(catalog, values), dirty = patch.length > 0;
  const blocked = mutation.blocked || latest !== undefined;
  function close() { if (mutation.busy()) return; if (dirty) setDiscard(true); else onClose(); }
  return <Dialog open title={discard ? "Bỏ thay đổi thông báo?" : "Tùy chọn thông báo"} dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    {discard ? <div className="space-y-4"><p>Các lựa chọn chưa lưu sẽ bị bỏ.</p><Button onClick={onClose}>Bỏ thay đổi và đóng</Button><Button variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button></div> : <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); if (mutation.busy() || blocked || !dirty) return; setNotice(undefined);
      const saved = await mutation.run(() => repository.savePush(patch));
      if (saved) { setCatalog(saved); setValues(selections(saved)); setNotice(saved.notice ?? "Đã lưu tùy chọn thông báo."); }
    }}>
      <p>Mọi thông báo đều được lưu trong hộp thư. Chọn những loại bạn muốn nhận thêm qua thông báo đẩy.</p>
      {!catalog.pushAllowedOnDevice && <p>Chưa có thiết bị cho phép nhận thông báo đẩy. Bạn vẫn có thể lưu lựa chọn.</p>}
      <ErrorNotice error={mutation.error} />{notice && <p role="status">{notice}</p>}
      {!catalog.types.length && <p>Chưa có tùy chọn dành cho tài khoản này.</p>}
      {catalog.types.map((row) => <div key={row.type} className="rounded-control border border-border p-3"><label className="flex min-h-12 items-center justify-between gap-3">
        <span>{labels[row.type] ?? row.name}</span><input type="checkbox" className="size-5" checked={values[row.type] ?? row.push} disabled={row.mandatory || blocked || mutation.pending}
          onChange={(event) => { setValues({ ...values, [row.type]: event.target.checked }); setNotice(undefined); }} /></label>
        {row.mandatory && <p className="text-sm">Thông báo bắt buộc nhận thông báo đẩy.</p>}
      </div>)}
      {(mutation.error || blocked) && <div className="space-y-3"><Button variant="secondary" disabled={mutation.pending} onClick={async () => {
        const next = await mutation.run(() => repository.notifications(), true); if (next && !Array.isArray(next)) setLatest(next);
      }}>Tải thiết lập hiện tại để đối chiếu</Button>{latest && <><ul>{latest.types.map((row) => <li key={row.type}>{labels[row.type] ?? row.name}: {row.push ? "Bật" : "Tắt"}</li>)}</ul>
        {mutation.uncertain ? <p>Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại tùy chọn trước khi thực hiện lượt mới.</p>
          : <Button variant="secondary" onClick={() => { setCatalog(latest); setValues(selections(latest)); setLatest(undefined); mutation.reviewed(); }}>Dùng thiết lập đã lưu</Button>}</>}</div>}
      <div className="flex gap-3"><Button type="submit" disabled={!dirty || blocked} isPending={mutation.pending}>Lưu tùy chọn</Button><Button variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button></div>
    </form>}
  </Dialog>;
}

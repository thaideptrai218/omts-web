"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as c from "./new-module-contracts";
import { ErrorNotice, Note, Select } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { approvalEffect, requestTypeLabel, requestWhat, type EmployeeRequest } from "./workforce-request-labels";
import { workforceRepository as repository } from "./workforce-shared";

/** Approve or reject one request (leave, missed check-in, missed check-out); a rejection requires a reason, and the confirmation says what approving writes. */
export function ReviewLeave({ record, onClose, onSaved }: { record: EmployeeRequest; onClose(): void; onSaved(): void }) {
  const [approved, setApproved] = useState(true);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, !approved || !!response);

  async function save() {
    const payload = c.reviewLeaveSchema.safeParse({ approved, response, rowVersion: record.rowVersion });
    if (!payload.success) {
      setError("Nhập lý do khi từ chối yêu cầu (tối đa 500 ký tự).");
      return;
    }
    setError(undefined);
    const result = await editor.submit(
      `${approved ? "Duyệt" : "Từ chối"} yêu cầu "${requestTypeLabel[record.type]}" của ${record.employeeName}, ${requestWhat(record)}? ${approved ? approvalEffect(record) : "Không ghi gì vào chấm công."}`,
      () => repository.write("review-leave", payload.data, c.leaveSchema, record.id),
    );
    if (result) onSaved();
  }

  return (
    <Dialog open title={`${requestTypeLabel[record.type]} · ${record.employeeName}`} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>
      {editor.dialog}
      <p>{requestWhat(record)} · {record.reason}</p>
      <ErrorNotice error={error || editor.mutation.error} />
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset disabled={editor.disabled} className="space-y-4">
          <Select label="Quyết định" value={approved ? "yes" : "no"} onChange={(e) => setApproved(e.target.value === "yes")}>
            <option value="yes">Duyệt</option>
            <option value="no">Từ chối</option>
          </Select>
          <p className="text-sm">{approved ? approvalEffect(record) : "Từ chối: không ghi gì vào chấm công. Nhân viên sẽ thấy lý do."}</p>
          <Note label={approved ? "Phản hồi" : "Lý do từ chối *"} required={!approved} maxLength={500} value={response} onChange={(e) => setResponse(e.target.value)} />
          <Button type="submit">Lưu quyết định</Button>
        </fieldset>
      </form>
      {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Đóng sau khi đối chiếu rồi mở lại yêu cầu mới; không tự gửi lại quyết định.</p>}
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
    </Dialog>
  );
}

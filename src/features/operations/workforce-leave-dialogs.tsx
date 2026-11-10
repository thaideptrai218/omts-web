"use client";
import styles from "./workforce-screen.module.css";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatVietnameseDate } from "@/shared/format/date-only";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Note, Paging, Select, Skeleton, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { workforceRepository as repository } from "./workforce-shared";

type Leave = z.infer<typeof c.leaveSchema>;
const LEAVES_PAGE_SIZE = 10;

function leaveStatus(leave: Leave) {
  if (leave.cancelledAt) return "Đã hủy";
  if (leave.approved === null) return "Chờ duyệt";
  return leave.approved ? "Đã duyệt" : "Từ chối";
}

/** Owner-only list of leave requests; pending, non-cancelled requests can be answered. */
export function OwnerLeavesDialog({ onClose }: { onClose(): void }) {
  const rows = useRemote(
    useMemo(() => (signal: AbortSignal) => repository.read("leaves", {}, z.array(c.leaveSchema), signal), []),
  );
  const [selected, setSelected] = useState<Leave>();
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, Math.max(1, Math.ceil((rows.data?.length ?? 0) / LEAVES_PAGE_SIZE)));
  const visibleRows = rows.data?.slice((currentPage - 1) * LEAVES_PAGE_SIZE, currentPage * LEAVES_PAGE_SIZE);

  return (
    <Dialog
      open
      size="lg"
      title="Duyệt nghỉ phép"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ErrorNotice error={rows.error} />
      <Button variant="secondary" disabled={rows.loading} onClick={rows.reload}>
        Tải lại yêu cầu nghỉ
      </Button>
      {rows.loading ? (
        <Skeleton />
      ) : (
        rows.data && (
          <DataTable
            headings={["Nhân viên", "Từ", "Đến", "Lý do", "Trạng thái", "Phản hồi", "Thao tác"]}
            empty={!rows.data.length}
          >
            {visibleRows?.map((r) => (
              <tr key={r.id}>
                <td>{r.employeeName}</td>
                <td>{formatVietnameseDate(r.from)}</td>
                <td>{formatVietnameseDate(r.to)}</td>
                <td>{r.reason}</td>
                <td>{leaveStatus(r)}</td>
                <td>{r.response || "—"}</td>
                <td>
                  {r.approved === null && !r.cancelledAt && (
                    <button className="text-primary underline" onClick={() => setSelected(r)}>
                      Phản hồi nghỉ phép
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )
      )}
      {rows.data && (
        <div className={styles.paging}>
          <Paging
            page={currentPage}
            total={rows.data.length}
            pageSize={LEAVES_PAGE_SIZE}
            disabled={rows.loading}
            onChange={setPage}
          />
        </div>
      )}
      {selected && (
        <ReviewLeave
          key={selected.id}
          record={selected}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            rows.reload();
          }}
        />
      )}
      <Button className="mt-4" variant="secondary" onClick={onClose}>
        Đóng
      </Button>
    </Dialog>
  );
}

/** Approve or reject one leave request; a rejection requires a reason. */
export function ReviewLeave({ record, onClose, onSaved }: { record: Leave; onClose(): void; onSaved(): void }) {
  const [approved, setApproved] = useState(true);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, !approved || !!response);

  async function save() {
    const payload = c.reviewLeaveSchema.safeParse({ approved, response, rowVersion: record.rowVersion });
    if (!payload.success) {
      setError("Nhập lý do khi từ chối nghỉ phép (tối đa 500 ký tự).");
      return;
    }
    const result = await editor.submit(
      `${approved ? "Duyệt" : "Từ chối"} nghỉ phép của ${record.employeeName}, ${record.from} đến ${record.to}?`,
      () => repository.write("review-leave", payload.data, c.leaveSchema, record.id),
    );
    if (result) onSaved();
  }

  return (
    <Dialog
      open
      title={`Nghỉ phép · ${record.employeeName}`}
      dismissible={!editor.pending}
      onOpenChange={(open) => {
        if (!open) void editor.close();
      }}
    >
      {editor.dialog}
      <p>
        {record.from} — {record.to} · {record.reason}
      </p>
      <ErrorNotice error={error || editor.mutation.error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={editor.disabled} className="space-y-4">
          <Select
            label="Quyết định nghỉ phép"
            value={approved ? "yes" : "no"}
            onChange={(e) => setApproved(e.target.value === "yes")}
          >
            <option value="yes">Duyệt</option>
            <option value="no">Từ chối</option>
          </Select>
          <Note
            label={approved ? "Phản hồi" : "Lý do từ chối *"}
            required={!approved}
            maxLength={500}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
          <Button type="submit">Lưu quyết định</Button>
        </fieldset>
      </form>
      {editor.mutation.blocked && (
        <p className="mt-3">
          Bản nháp đang được giữ. Đóng sau khi đối chiếu rồi mở lại yêu cầu mới; không tự gửi lại quyết định.
        </p>
      )}
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>
        Đóng
      </Button>
    </Dialog>
  );
}

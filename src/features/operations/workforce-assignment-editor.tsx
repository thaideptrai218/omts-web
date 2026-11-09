"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "./lookups";
import { operationAllowed } from "./permissions";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Select, businessToday, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { WorkforceFormSection } from "./workforce-layout";
import { workforceRepository as repository } from "./workforce-shared";

/**
 * "assign" creates assignments for a chosen day (today or later);
 * "crew" changes today's job/raft for already-assigned employees.
 */
export function AssignmentEditor({
  mode,
  initialDay,
  onClose,
  onSaved,
}: {
  mode: "assign" | "crew";
  initialDay: string;
  onClose(): void;
  onSaved(): void;
}) {
  const context = useApiWorkspace();
  const [values, setValues] = useState({
    zoneId: "",
    raftId: "",
    jobTypeId: "",
    // Crew changes always apply to today; new assignments cannot start in the past.
    date: mode === "crew" ? businessToday() : initialDay < businessToday() ? businessToday() : initialDay,
    moveExisting: false,
  });
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [initial] = useState(() => JSON.stringify(values));
  const editor = useOperationEditor(onClose, JSON.stringify(values) !== initial || employeeIds.length > 0);
  const options = useRemote(
    useMemo(
      () => (signal: AbortSignal) => repository.read("lookups", { day: values.date }, c.workforceLookupsSchema, signal),
      [values.date],
    ),
  );
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => loadOptions("zones", signal), []));
  const rafts = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        values.zoneId
          ? loadOptions("rafts", signal, { zoneId: values.zoneId, statusId: "101" })
          : Promise.resolve({ status: "success" as const, data: [] }),
      [values.zoneId],
    ),
  );
  const allowedZones = zones.data?.filter(
    (zone) =>
      zone.statusId === 101 &&
      operationAllowed(
        "workforce",
        context.identity,
        context.permissions.functionPermissions,
        mode === "assign" ? "Create" : "Edit",
        zone.id,
      ),
  );

  function confirmationMessage() {
    const verb = mode === "assign" ? "Phân công" : "Đổi việc cho";
    const raftCode = String(rafts.data?.find((r) => r.id === values.raftId)?.code ?? "đã chọn");
    const jobName = options.data?.jobs.find((r) => r.id === values.jobTypeId)?.name ?? "công việc đã chọn";
    const moveNote = values.moveExisting ? "; chuyển phân công đã có" : "";
    return `${verb} ${employeeIds.length} nhân viên, ngày ${values.date}, bè ${raftCode}, ${jobName}${moveNote}?`;
  }

  async function save() {
    const payload =
      mode === "assign"
        ? c.assignWorkSchema.safeParse({
            raftId: values.raftId,
            jobTypeId: values.jobTypeId,
            date: values.date,
            employeeIds,
            moveExisting: values.moveExisting,
          })
        : c.crewWorkSchema.safeParse({ raftId: values.raftId, jobTypeId: values.jobTypeId, employeeIds });
    if (!payload.success || !values.zoneId || (mode === "assign" && values.date < businessToday())) {
      setError("Chọn vùng, bè, công việc, ngày hợp lệ và ít nhất một nhân viên (tối đa 100).");
      return;
    }
    setError(undefined);
    const result = await editor.submit(confirmationMessage(), () =>
      repository.write<unknown>(
        mode === "assign" ? "assign" : "crew",
        payload.data,
        mode === "assign" ? z.array(c.assignmentSchema) : z.object({ done: z.literal(true) }),
        undefined,
        values.zoneId,
      ),
    );
    if (result) onSaved();
  }

  return (
    <Dialog
      open
      size="lg"
      title={mode === "assign" ? "Tạo phân công" : "Đổi việc trong ngày"}
      description="Chọn lịch, địa điểm làm việc và nhân viên trong vùng được cấp."
      dismissible={!editor.pending}
      onOpenChange={(open) => {
        if (!open) void editor.close();
      }}
    >
      {editor.dialog}
      <ErrorNotice error={error || editor.mutation.error || options.error || zones.error || rafts.error} />
      <Button
        variant="secondary"
        disabled={editor.pending || options.loading || zones.loading || rafts.loading}
        onClick={() => {
          options.reload();
          zones.reload();
          if (values.zoneId) rafts.reload();
        }}
      >
        Tải lại danh mục phân công
      </Button>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={editor.disabled} className="space-y-4">
          <WorkforceFormSection number="01" title="Lịch và địa điểm">
            {mode === "crew" && <p>Ngày đổi việc: {values.date}</p>}
            {mode === "assign" && (
              <Field
                label="Ngày phân công *"
                type="date"
                min={businessToday()}
                required
                value={values.date}
                onChange={(e) => setValues({ ...values, date: e.target.value })}
              />
            )}
            <Select
              label="Vùng phân công *"
              required
              value={values.zoneId}
              onChange={(e) => setValues({ ...values, zoneId: e.target.value, raftId: "" })}
            >
              <option value="">Chọn vùng</option>
              {allowedZones?.map((r) => (
                <option key={r.id} value={r.id}>
                  {String(r.name)}
                </option>
              ))}
            </Select>
            <Select
              label="Bè làm việc *"
              required
              value={values.raftId}
              onChange={(e) => setValues({ ...values, raftId: e.target.value })}
            >
              <option value="">Chọn bè</option>
              {rafts.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {String(r.code)}
                </option>
              ))}
            </Select>
            <Select
              label="Loại công việc *"
              required
              value={values.jobTypeId}
              onChange={(e) => setValues({ ...values, jobTypeId: e.target.value })}
            >
              <option value="">Chọn công việc</option>
              {options.data?.jobs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </WorkforceFormSection>
          <WorkforceFormSection number="02" title="Nhân viên">
            <fieldset className="max-h-64 overflow-auto rounded-control border border-border p-3">
              <legend>Nhân viên được phân công</legend>
              {options.data?.employees.map((r) => (
                <label key={r.id} className="flex gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={employeeIds.includes(r.id)}
                    onChange={(e) =>
                      setEmployeeIds((ids) => (e.target.checked ? [...ids, r.id] : ids.filter((id) => id !== r.id)))
                    }
                  />
                  {r.name}
                  {r.onLeave && " · Đã duyệt nghỉ ngày này"}
                </label>
              ))}
              {options.data && !options.data.employees.length && <p>Chưa có nhân viên đang làm việc.</p>}
            </fieldset>
            {mode === "assign" && (
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={values.moveExisting}
                  onChange={(e) => setValues({ ...values, moveExisting: e.target.checked })}
                />
                Chuyển phân công đã có của các nhân viên được chọn
              </label>
            )}
          </WorkforceFormSection>
          <Button type="submit" disabled={options.loading || zones.loading || rafts.loading}>
            {mode === "assign" ? "Lưu phân công" : "Lưu đổi việc"}
          </Button>
        </fieldset>
      </form>
      {editor.mutation.blocked && (
        <p className="mt-3">Bản nháp đang được giữ; đối chiếu bảng phân công trước khi lập lượt mới.</p>
      )}
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>
        Đóng
      </Button>
    </Dialog>
  );
}

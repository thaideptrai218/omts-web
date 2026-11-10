"use client";
import styles from "./workforce-screen.module.css";
import { FilterChecks } from "@/components/ui/filter-checks";
import { matchesSelection } from "@/shared/presentation/filter-selection";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { ManagementHeading } from "@/components/ui/management-page";
import { formatVietnameseDate, isDateOnly } from "@/shared/format/date-only";
import { useMemo, useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "./lookups";
import { operationAllowed } from "./permissions";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Select, businessToday, useRemote, Skeleton, Paging } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { AssignmentEditor } from "./workforce-assignment-editor";
import { WorkforceAssignmentRow, type AssignmentAction, type WorkforceTab } from "./workforce-assignment-row";
import { WorkforceEmpty } from "./workforce-layout";
import { OwnerLeavesDialog, ReviewLeave } from "./workforce-leave-dialogs";
import { WorkforceSetupDialog } from "./workforce-setup-dialog";
import {
  attendanceLabel,
  attendanceState,
  workforceRepository as repository,
  type Assignment,
} from "./workforce-shared";

// Dialogs live in their own modules; keep exporting them from here for existing importers.
export { AssignmentEditor, ReviewLeave };

/** Daily assignment and attendance board for the zones the user may see. */
export function WorkforceScreen() {
  const context = useApiWorkspace();
  const [day, setDay] = useState(businessToday);
  // Which dialog is open, if any.
  const [form, setForm] = useState<"assign" | "crew" | "job" | "settings" | "leaves">();
  const [notice, setNotice] = useState<string>();
  const [zoneId, setZoneId] = useState("");
  const [search, setSearch] = useState("");
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => loadOptions("zones", signal), []));
  const rows = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        day
          ? repository.read("list", { day }, z.array(c.assignmentSchema), signal)
          : Promise.resolve({ status: "success" as const, data: [] }),
      [day],
    ),
  );
  const [tab, setTab] = useState<WorkforceTab>("assignments");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");

  // Zone + free-text filtering feeds the summary; the status filter only narrows the table.
  const term = search.trim().toLocaleLowerCase("vi-VN");
  const scopedRows = rows.data?.filter(
    (row) =>
      (!zoneId || row.zoneId === zoneId) &&
      (!term ||
        [row.employeeName, row.raftCode ?? "", row.job].some((value) =>
          value.toLocaleLowerCase("vi-VN").includes(term),
        )),
  );
  const filteredRows = scopedRows?.filter((row) => matchesSelection(status, attendanceState(row)));
  const currentPage = Math.min(page, Math.max(1, Math.ceil((filteredRows?.length ?? 0) / pageSize)));
  const visibleRows = filteredRows?.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const zoneName = (id: string) => String(zones.data?.find((zone) => zone.id === id)?.name ?? id);
  const editor = useOperationEditor(() => {}, false);
  const allowed = (action: string, zoneId?: string) =>
    operationAllowed("workforce", context.identity, context.permissions.functionPermissions, action, zoneId);
  // Zone filter options: zones the user may view plus any zone that appears in the loaded rows.
  const zoneOptions = [
    ...new Set([
      ...(zones.data?.filter((zone) => allowed("View", zone.id)).map((zone) => zone.id) ?? []),
      ...(rows.data?.map((row) => row.zoneId) ?? []),
    ]),
  ];

  function actionQuestion(row: Assignment, action: AssignmentAction) {
    if (action === "remove") return `Gỡ phân công của ${row.employeeName} ngày ${formatVietnameseDate(row.date)}?`;
    const verb = action === "check-in" ? "vào làm" : "ra về";
    const missingCheckIn =
      action === "check-out" && !row.checkedInAt ? "; chưa có lượt vào làm, ngày công sẽ thiếu lượt" : "";
    return `Ghi ${verb} cho ${row.employeeName} lúc hiện tại${missingCheckIn}?`;
  }

  function moveDay(offset: number) {
    if (!isDateOnly(day)) return;
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const next = date.toISOString().slice(0, 10);
    if (!isDateOnly(next)) return;
    setDay(next);
    setPage(1);
  }

  async function act(row: Assignment, action: AssignmentAction) {
    const result = await editor.submit(actionQuestion(row, action), () =>
      repository.write<unknown>(
        action,
        action === "remove" ? {} : { qrCode: null },
        action === "remove" ? z.object({ done: z.literal(true) }) : c.assignmentSchema,
        row.id,
        row.zoneId,
      ),
    );
    if (result) {
      setNotice("Đã ghi nhận thao tác.");
      rows.reload();
    }
  }
  return (
    <section className={styles.page}>
      {editor.dialog}
      <ManagementHeading
        title="Phân công và chấm công"
        description="Lập lịch theo ngày, theo dõi nhân viên và các lượt vào/ra trong vùng được cấp."
        icon="attendance"
      >
        {allowed("Create") && (
          <Button className="w-auto" disabled={editor.disabled} onClick={() => setForm("assign")}>
            Tạo phân công
          </Button>
        )}
      </ManagementHeading>
      <div className={styles.tools}>
        {allowed("Edit") && (
          <Button variant="secondary" disabled={editor.disabled} onClick={() => setForm("crew")}>
            Đổi việc trong ngày
          </Button>
        )}
        {operationAllowed("job-types", context.identity, context.permissions.functionPermissions) && (
          <Link href="/operations/job-types">Loại công việc & đơn giá →</Link>
        )}
        {context.identity.subjectType === "CooperativeOwner" && (
          <>
            {(["settings", "leaves"] as const).map((key) => (
              <Button key={key} variant="secondary" disabled={editor.disabled} onClick={() => setForm(key)}>
                {key === "settings" ? "Thiết lập chấm công" : "Duyệt nghỉ phép"}
              </Button>
            ))}
          </>
        )}
      </div>
      <FilterWorkspace
        label="Lịch và phạm vi"
        filters={
          <>
            <Field
              label="Ngày làm việc"
              type="date"
              required
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setPage(1);
              }}
            />
            <Select
              label="Vùng làm việc"
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vùng được cấp</option>
              {zoneOptions.map((id) => (
                <option key={id} value={id}>
                  {zoneName(id)}
                </option>
              ))}
            </Select>
            <FilterChecks
              label="Trạng thái chấm công"
              value={status}
              options={Object.entries(attendanceLabel)}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
          </>
        }
        reset={
          <button
            className={styles.textAction}
            type="button"
            onClick={() => {
              setZoneId("");
              setSearch("");
              setStatus("");
              setPage(1);
            }}
          >
            Đặt lại
          </button>
        }
      >
        <div className="mb-5 max-w-xl">
          <Field
            label="Tìm nhân viên, bè hoặc công việc"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <ErrorNotice error={zones.error || rows.error || editor.mutation.error} />
        {zones.error && (
          <Button variant="secondary" onClick={zones.reload}>
            Tải lại danh mục vùng
          </Button>
        )}
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}
        {editor.mutation.blocked && (
          <p className={styles.blocked}>
            Chưa thể gửi tiếp. Đối chiếu phân công và chấm công trước khi lập lượt mới; tải lại không tự gửi lại thao
            tác.
          </p>
        )}
        <div className={styles.dayHeading}>
          <div>
            <span>LỊCH LÀM VIỆC</span>
            <h2>{day ? formatVietnameseDate(day) : "Chọn ngày làm việc"}</h2>
            <p>{zoneId ? zoneName(zoneId) : "Tất cả vùng được cấp"}</p>
          </div>
          <div className={styles.dateNavigation} role="group" aria-label="Chuyển ngày làm việc">
            <button type="button" aria-label="Ngày trước" disabled={!isDateOnly(day) || rows.loading} onClick={() => moveDay(-1)}>←</button>
            <button type="button" disabled={day === businessToday()} onClick={() => { setDay(businessToday()); setPage(1); }}>Hôm nay</button>
            <button type="button" aria-label="Ngày sau" disabled={!isDateOnly(day) || rows.loading} onClick={() => moveDay(1)}>→</button>
          </div>
          <Button variant="secondary" disabled={rows.loading || !day || editor.pending} onClick={rows.reload}>
            Tải lại phân công
          </Button>
        </div>
        <dl className={styles.summary} aria-busy={rows.loading || !!rows.error}>
          {[
            ["Phân công", scopedRows?.length],
            ["Nhân viên", scopedRows ? new Set(scopedRows.map((row) => row.employeeId)).size : undefined],
            ["Đang làm", scopedRows?.filter((row) => attendanceState(row) === "working").length],
            ["Thiếu lượt vào", scopedRows?.filter((row) => attendanceState(row) === "missing").length],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{rows.loading || rows.error ? "—" : (value ?? 0)}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.tabs} role="group" aria-label="Cách xem lịch làm việc">
          <button type="button" aria-pressed={tab === "assignments"} onClick={() => setTab("assignments")}>
            Phân công
          </button>
          <button type="button" aria-pressed={tab === "attendance"} onClick={() => setTab("attendance")}>
            Chấm công
          </button>
          <span>{filteredRows?.length ?? 0} phân công phù hợp</span>
        </div>
        {rows.loading ? (
          <Skeleton />
        ) : (
          filteredRows &&
          (filteredRows.length ? (
            <DataTable
              responsive
              headings={
                tab === "assignments"
                  ? ["Nhân viên", "Vùng / bè", "Công việc", "Trạng thái", "Thao tác"]
                  : ["Nhân viên", "Vùng / bè", "Vào làm", "Ra về", "Trạng thái", "Thao tác"]
              }
            >
              {visibleRows?.map((row) => (
                <WorkforceAssignmentRow
                  key={row.id}
                  row={row}
                  tab={tab}
                  zoneName={zoneName}
                  allowed={allowed}
                  disabled={editor.disabled}
                  onAct={(target, action) => void act(target, action)}
                />
              ))}
            </DataTable>
          ) : (
            <WorkforceEmpty filtered={!!zoneId || !!search || !!status} />
          ))
        )}
        {filteredRows && (
          <div className={styles.paging}>
            <Select
              label="Số phân công mỗi trang"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} phân công
                </option>
              ))}
            </Select>
            <Paging
              page={currentPage}
              total={filteredRows.length}
              pageSize={pageSize}
              disabled={rows.loading || editor.pending}
              onChange={setPage}
            />
          </div>
        )}
      </FilterWorkspace>
      {(form === "assign" || form === "crew") && (
        <AssignmentEditor
          mode={form}
          initialDay={day || businessToday()}
          onClose={() => setForm(undefined)}
          onSaved={() => {
            setForm(undefined);
            rows.reload();
            setNotice("Đã lưu phân công.");
          }}
        />
      )}
      {(form === "job" || form === "settings") && (
        <WorkforceSetupDialog mode={form} onClose={() => setForm(undefined)} />
      )}
      {form === "leaves" && <OwnerLeavesDialog onClose={() => setForm(undefined)} />}
    </section>
  );
}

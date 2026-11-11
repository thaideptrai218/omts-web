"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import type { SortState } from "@/components/ui/management-screen/management-table";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { formatVietnameseDate, isDateOnly } from "@/shared/format/date-only";
import { loadOptions } from "./lookups";
import * as c from "./new-module-contracts";
import { operationAllowed } from "./permissions";
import { businessToday, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { sortAssignments } from "./workforce-columns";
import { attendanceState, workforceRepository as repository, type Assignment, type AssignmentAction, type WorkforceTab } from "./workforce-shared";

/** Which pop-up of the board is open, if any. */
export type WorkforceForm = "assign" | "crew" | "job" | "settings" | "leaves";

function actionQuestion(row: Assignment, action: AssignmentAction) {
  if (action === "remove") return `Gỡ phân công của ${row.employeeName} ngày ${formatVietnameseDate(row.date)}?`;
  const verb = action === "check-in" ? "vào làm" : "ra về";
  const missingCheckIn = action === "check-out" && !row.checkedInAt ? "; chưa có lượt vào làm, ngày công sẽ thiếu lượt" : "";
  return `Ghi ${verb} cho ${row.employeeName} lúc hiện tại${missingCheckIn}?`;
}

/**
 * State of the day board: the day and filters drive the query/filtering, the list is paged on the client
 * (the API returns the whole day), and one row at most is open. Any filter change returns to page 1 and closes the open row.
 */
export function useWorkforceBoard() {
  const context = useApiWorkspace();
  const [day, setDay] = useState(businessToday);
  const [form, setForm] = useState<WorkforceForm>();
  const [notice, setNotice] = useState<string>();
  const [zoneId, setZoneId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<WorkforceTab>("assignments");
  const [sort, setSort] = useState<SortState>({ key: "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expanded, setExpanded] = useState<string>();
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => loadOptions("zones", signal), []));
  const rows = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        day ? repository.read("list", { day }, z.array(c.assignmentSchema), signal) : Promise.resolve({ status: "success" as const, data: [] }),
      [day],
    ),
  );
  const editor = useOperationEditor(() => {}, false);
  const allowed = (action: string, zone?: string) =>
    operationAllowed("workforce", context.identity, context.permissions.functionPermissions, action, zone);

  const term = search.trim().toLocaleLowerCase("vi-VN");
  // Zone + free-text filtering feeds the summary; the status filter only narrows the table.
  const scopedRows = rows.data?.filter(
    (row) =>
      (!zoneId || row.zoneId === zoneId) &&
      (!term || [row.employeeName, row.raftCode ?? "", row.job].some((value) => value.toLocaleLowerCase("vi-VN").includes(term))),
  );
  const zoneName = (id: string) => String(zones.data?.find((zone) => zone.id === id)?.name ?? id);
  const filteredRows = scopedRows && sortAssignments(scopedRows.filter((row) => !status || attendanceState(row) === status), sort, mode, zoneName);
  const lastPage = Math.max(1, Math.ceil((filteredRows?.length ?? 0) / pageSize));
  const currentPage = Math.min(page, lastPage);
  const visibleRows = filteredRows?.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  // Zone filter options: zones the user may view plus any zone that appears in the loaded rows.
  const zoneOptions = [
    ...new Set([...(zones.data?.filter((zone) => allowed("View", zone.id)).map((zone) => zone.id) ?? []), ...(rows.data?.map((row) => row.zoneId) ?? [])]),
  ];

  /** Wraps a filter setter so the list restarts from page 1 with no open row. */
  const changed = <T,>(apply: (value: T) => void) => (value: T) => {
    apply(value);
    setPage(1);
    setExpanded(undefined);
  };
  function moveDay(offset: number) {
    if (!isDateOnly(day)) return;
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const next = date.toISOString().slice(0, 10);
    if (isDateOnly(next)) changed(setDay)(next);
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
      setExpanded(undefined);
      rows.reload();
    }
  }

  return {
    context, day, form, setForm, notice, setNotice, zoneId, search, status, mode, sort, pageSize, expanded,
    zones, rows, editor, allowed, zoneName, zoneOptions, scopedRows, filteredRows, visibleRows, currentPage,
    hasFilter: !!zoneId || !!search || !!status,
    setDay: changed(setDay), setZoneId: changed(setZoneId), setSearch: changed(setSearch), setStatus: changed(setStatus),
    setMode: changed<WorkforceTab>(setMode), setSort: changed<SortState>(setSort), setPageSize: changed<number>(setPageSize),
    setPage: (next: number) => { setPage(next); setExpanded(undefined); },
    toggleRow: (id: string) => setExpanded((value) => (value === id ? undefined : id)),
    reset: changed<void>(() => { setZoneId(""); setSearch(""); setStatus(""); }),
    moveDay, goToday: () => changed(setDay)(businessToday()), act,
  };
}

export type WorkforceBoard = ReturnType<typeof useWorkforceBoard>;

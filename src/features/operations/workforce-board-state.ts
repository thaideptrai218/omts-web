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
import { MAX_BULK, runBulk, verbOf, type BulkAction, type BulkResult } from "./workforce-bulk-actions";
import { sortAssignments } from "./workforce-columns";
import { attendanceState, isCarryOver, workforceRepository as repository, type Assignment, type AssignmentAction, type WorkforceTab } from "./workforce-shared";

/** Which pop-up of the board is open, if any. */
export type WorkforceForm = "assign" | "crew" | "crew-start" | "job" | "settings" | "leaves";

const removeQuestion = (row: Assignment) => `Gỡ phân công của ${row.employeeName} ngày ${formatVietnameseDate(row.date)}?`;

const shiftDate = (day: string, offset: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

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
  // The row whose check-in/out/removal is being sent: only its buttons show progress, the list stays as it is.
  const [pendingId, setPendingId] = useState<string>();
  const zones = useRemote(useMemo(() => (signal: AbortSignal) => loadOptions("zones", signal), []));
  const rows = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        day ? repository.read("list", { day }, z.array(c.assignmentSchema), signal) : Promise.resolve({ status: "success" as const, data: [] }),
      [day],
    ),
  );
  // Night shift: rows of yesterday that have a check-in and no check-out stay on today's board so the check-out can still be recorded.
  const today = businessToday();
  const carry = useRemote(
    useMemo(
      () => (signal: AbortSignal) => day === today ? repository.read("list", { day: shiftDate(day, -1) }, z.array(c.assignmentSchema), signal) : Promise.resolve({ status: "success" as const, data: [] as Assignment[] }),
      [day, today],
    ),
  );
  const allRows = useMemo(
    () => {
      const own = rows.data;
      return own && [...own, ...(carry.data ?? []).filter((row) => isCarryOver(row, day) && !own.some((existing) => existing.id === row.id))];
    },
    [rows.data, carry.data, day],
  );
  const allowed = (action: string, zone?: string) =>
    operationAllowed("workforce", context.identity, context.permissions.functionPermissions, action, zone);
  // Requests awaiting review (Owner, or Staff holding ATTENDANCE Edit; the backend limits them to the zones of the caller): the number on the menu entry "Duyệt yêu cầu".
  const canReview = allowed("AttendanceEdit");
  const requests = useRemote(
    useMemo(() => (signal: AbortSignal) => canReview ? repository.read("leaves", {}, z.array(c.leaveSchema), signal) : Promise.resolve({ status: "success" as const, data: [] as z.infer<typeof c.leaveSchema>[] }), [canReview]),
  );
  const pendingRequests = requests.data?.filter((request) => request.approved === null && !request.cancelledAt).length ?? 0;
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkResults, setBulkResults] = useState<{ action: BulkAction; items: BulkResult[] }>();
  const [correcting, setCorrecting] = useState<{ employeeId: string; day: string }>();
  const editor = useOperationEditor(() => {}, false);

  const term = search.trim().toLocaleLowerCase("vi-VN");
  // Zone + free-text filtering feeds the summary; the status filter only narrows the table.
  const scopedRows = allRows?.filter(
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
    ...new Set([...(zones.data?.filter((zone) => allowed("View", zone.id)).map((zone) => zone.id) ?? []), ...(allRows?.map((row) => row.zoneId) ?? [])]),
  ];

  /** Wraps a filter setter so the list restarts from page 1 with no open row. */
  const changed = <T,>(apply: (value: T) => void) => (value: T) => {
    apply(value);
    setPage(1);
    setExpanded(undefined);
    setSelected(new Set());
  };
  function moveDay(offset: number) {
    if (!isDateOnly(day)) return;
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const next = date.toISOString().slice(0, 10);
    if (isDateOnly(next)) changed(setDay)(next);
  }
  async function act(row: Assignment, action: AssignmentAction) {
    const send = () => {
      setPendingId(row.id);
      return repository.write<unknown>(
        action,
        action === "remove" ? {} : { qrCode: null },
        action === "remove" ? z.object({ done: z.literal(true) }) : c.assignmentSchema,
        row.id,
        row.zoneId,
      );
    };
    // A normal check-in or check-out is one click (time = now, reversible by the Owner correction); only removing an assignment asks first.
    const result = await (action === "remove" ? editor.submit(removeQuestion(row), send) : editor.mutation.run(send));
    setPendingId(undefined);
    if (result) {
      setNotice("Đã ghi nhận thao tác.");
      // Only a removed row closes; otherwise the opened row, the page and the scroll position stay, and the list is refetched without a loading state.
      if (action === "remove") setExpanded(undefined);
      rows.refresh();
      carry.refresh();
    }
  }
  /** Check-in or check-out of the ticked rows, one by one after a single confirmation; the result of each person is listed. */
  async function bulk(action: BulkAction) {
    const chosen = (scopedRows ?? []).filter((row) => selected.has(row.id));
    if (!chosen.length || chosen.length > MAX_BULK) return;
    setBulkResults(undefined);
    const items = await editor.submit(`Ghi ${verbOf(action)} cho ${chosen.length} nhân viên đã chọn lúc hiện tại?`, async () => ({ status: "success" as const, data: await runBulk(chosen, action, today, allowed) }));
    if (!items) return;
    setBulkResults({ action, items });
    setSelected(new Set(items.filter((item) => !item.ok).map((item) => item.id)));
    rows.refresh();
    carry.refresh();
  }

  return {
    context, day, form, setForm, notice, setNotice, zoneId, search, status, mode, sort, pageSize, expanded, pendingId,
    zones, rows, carry, allRows, requests, pendingRequests, editor, allowed, today, selected, setSelected, bulkResults, clearBulkResults: () => setBulkResults(undefined), bulk, correcting, setCorrecting, zoneName, zoneOptions, scopedRows, filteredRows, visibleRows, currentPage,
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

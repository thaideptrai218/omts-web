"use client";
import { useCallback, useMemo, useState } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { searchResult } from "./invoice-list-contracts";
import { defaultFilters, filterProblem, pageSize, toQuery, type Filters } from "./invoice-list-logic";

export const invoiceRepository = createOperationsRepository("sales-invoice-list");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
export type ZoneOption = { id: string; label: string };

/**
 * Trạng thái màn Hóa đơn bán. Bộ lọc nhập ở `draft`, chỉ khi bấm "Xem" mới thành `applied` và gọi API (ngày đang gõ dở không bắn yêu cầu).
 * Xuất Excel luôn dùng bộ lọc đã áp dụng, đúng với bảng đang xem. Ngày "hôm nay" cố định theo lúc mở màn (giờ Việt Nam) để truy vấn ổn định.
 */
export function useInvoiceList() {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const [today] = useState(businessToday);
  const [draft, setDraft] = useState<Filters>(defaultFilters), [applied, setApplied] = useState<Filters>(defaultFilters), [page, setPage] = useState(1);
  const allowed = (action: string, zoneId?: string) => operationAllowed("sales-invoice-list", workspace.identity, workspace.permissions.functionPermissions, action, zoneId);

  const zones = useRemote(loadZones);
  const zoneOptions = useMemo<ZoneOption[]>(() => (zones.data ?? []).filter((zone) => operationAllowed("sales-invoice-list", workspace.identity, workspace.permissions.functionPermissions, "View", zone.id))
    .map((zone) => ({ id: zone.id, label: String(zone.name ?? zone.code ?? zone.id) })), [zones.data, workspace.identity, workspace.permissions.functionPermissions]);

  const filterQuery = useMemo(() => toQuery(applied, today), [applied, today]);
  const listQuery = useMemo(() => ({ ...filterQuery, page: String(page), pageSize: String(pageSize) }), [filterQuery, page]);
  const list = useRemote(useCallback((signal: AbortSignal) => invoiceRepository.read("list", listQuery, searchResult, signal), [listQuery]));

  return {
    draft, applied, problem: filterProblem(draft), zones, zoneOptions, list, page, setPage,
    canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    changeDraft: (patch: Partial<Filters>) => setDraft((current) => ({ ...current, ...patch })),
    apply: () => { if (filterProblem(draft)) return; setPage(1); setApplied(draft); },
    reset: () => { const fresh = defaultFilters(); setDraft(fresh); setApplied(fresh); setPage(1); },
    /** Ô tìm theo mã hóa đơn ở thanh công cụ: áp dụng ngay cùng các bộ lọc đã áp dụng. */
    searchCode: (code: string) => { setDraft((current) => ({ ...current, code })); setApplied((current) => ({ ...current, code })); setPage(1); },
    exportList: () => { void exporter.run(() => invoiceRepository.download(filterQuery), true); },
  };
}

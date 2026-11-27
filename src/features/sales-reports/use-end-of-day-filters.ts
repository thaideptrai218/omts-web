"use client";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { businessToday } from "@/features/operations/ui";
import { filterProblem, readFilters, writeFilters, type EndOfDayFilters } from "./end-of-day-filters-model";
import { useHeaderReportZones } from "./use-header-report-zones";

/**
 * Bộ lọc kiểu "nháp -> Xem báo cáo": người dùng chỉnh `draft`, chỉ khi `apply` thì `applied` đổi và màn gọi API; `applied` được ghi lên query string.
 * `applyNow` áp dụng ngay một thay đổi không cần gọi lại bằng nút (kiểu hiển thị, hướng giấy, mối quan tâm) cho cả nháp lẫn bản đã áp dụng.
 * `restore` đặt lại cả hai về một bản chụp cũ (nút Quay lại / Tới của trang báo cáo). Cần `<Suspense>` quanh màn (useSearchParams).
 * Vùng nuôi không nằm trong nháp: `zoneIds` của cả hai luôn là vùng đang chọn ở thanh trên (rỗng = mọi vùng được phép); đổi ở cột lọc ghi ngược lên thanh trên,
 * bản chụp cũ không đổi vùng, và link có `?zones=a,b` thu hẹp thanh trên một lần khi mở màn.
 */
export function useEndOfDayFilters() {
  const params = useSearchParams(), [today] = useState(businessToday);
  const [initial] = useState(() => readFilters(params, today));
  const [draftState, setDraft] = useState(initial), [appliedState, setApplied] = useState(initial);
  const { zoneIds, setZoneIds } = useHeaderReportZones(initial.zoneIds);
  const draft = useMemo(() => ({ ...draftState, zoneIds }), [draftState, zoneIds]);
  const applied = useMemo(() => ({ ...appliedState, zoneIds }), [appliedState, zoneIds]);
  const problem = filterProblem(draft, today);
  const commit = useCallback((next: EndOfDayFilters) => {
    setApplied(next);
    const query = writeFilters({ ...next, zoneIds: [] }, today).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [today]);
  const change = useCallback((patch: Partial<EndOfDayFilters>) => {
    if (patch.zoneIds) setZoneIds(patch.zoneIds);
    setDraft((current) => ({ ...current, ...patch, zoneIds: current.zoneIds }));
  }, [setZoneIds]);
  const applyNow = useCallback((patch: Partial<EndOfDayFilters>) => { setDraft((current) => ({ ...current, ...patch })); commit({ ...appliedState, ...patch }); }, [appliedState, commit]);
  const restore = useCallback((snapshot: EndOfDayFilters) => { setDraft(snapshot); commit(snapshot); }, [commit]);
  return {
    today, draft, applied, problem, change, applyNow, restore,
    apply: () => { if (!problem) commit(draftState); },
    reset: () => { const fresh = readFilters(new URLSearchParams(), today); const keep = { layout: appliedState.layout, orientation: appliedState.orientation }; setDraft({ ...fresh, ...keep }); commit({ ...fresh, ...keep }); },
  };
}

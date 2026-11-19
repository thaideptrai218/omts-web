"use client";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { businessToday } from "@/features/operations/ui";
import { filterProblem, readFilters, writeFilters, type EndOfDayFilters } from "./end-of-day-filters-model";

/**
 * Bộ lọc kiểu "nháp -> Xem báo cáo": người dùng chỉnh `draft`, chỉ khi `apply` thì `applied` đổi và màn gọi API; `applied` được ghi lên query string.
 * `applyNow` áp dụng ngay một thay đổi không cần gọi lại bằng nút (kiểu hiển thị, hướng giấy, mối quan tâm) cho cả nháp lẫn bản đã áp dụng.
 * `restore` đặt lại cả hai về một bản chụp cũ (nút Quay lại / Tới của trang báo cáo). Cần `<Suspense>` quanh màn (useSearchParams).
 */
export function useEndOfDayFilters() {
  const params = useSearchParams(), [today] = useState(businessToday);
  const [initial] = useState(() => readFilters(params, today));
  const [draft, setDraft] = useState(initial), [applied, setApplied] = useState(initial);
  const problem = filterProblem(draft, today);
  const commit = useCallback((next: EndOfDayFilters) => {
    setApplied(next);
    const query = writeFilters(next, today).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [today]);
  const change = useCallback((patch: Partial<EndOfDayFilters>) => setDraft((current) => ({ ...current, ...patch })), []);
  const applyNow = useCallback((patch: Partial<EndOfDayFilters>) => { setDraft((current) => ({ ...current, ...patch })); commit({ ...applied, ...patch }); }, [applied, commit]);
  const restore = useCallback((snapshot: EndOfDayFilters) => { setDraft(snapshot); commit(snapshot); }, [commit]);
  return {
    today, draft, applied, problem, change, applyNow, restore,
    apply: () => { if (!problem) commit(draft); },
    reset: () => { const fresh = readFilters(new URLSearchParams(), today); const keep = { layout: applied.layout, orientation: applied.orientation }; setDraft({ ...fresh, ...keep }); commit({ ...fresh, ...keep }); },
  };
}

"use client";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { boundedRange, customRange } from "@/components/ui/management-screen/time-range-limits";
import { fromQueryDate, presetValue, type TimePreset, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { businessToday } from "@/features/operations/ui";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ZONES = 50;
const MAX_EXTRA_LENGTH = 64;

/** Giá trị bộ lọc của một báo cáo: kỳ, vùng (rỗng = tất cả vùng được phép) và các tiêu chí riêng của từng báo cáo (`extra`). */
export type ReportFilterValues<E extends Record<string, string>> = Readonly<{ time: TimeRangeValue; zoneIds: readonly string[]; extra: E }>;

export type ReportFilterOptions<E extends Record<string, string>> = Readonly<{
  /** Giá trị cho phép của từng tiêu chí enum; ngoài danh sách thì dùng mặc định (chặn giá trị lạ từ URL). */
  allowed?: Partial<Record<keyof E, readonly string[]>>;
  /** Tiêu chí dạng mã định danh (GUID), ví dụ khách hàng; chỉ nhận GUID hợp lệ từ URL. */
  guidKeys?: readonly (keyof E)[];
  /** Kỳ mặc định khi URL chưa có from/to và khi Đặt lại; mặc định "Tháng này" (báo cáo Tài chính dùng "Năm nay"). */
  defaultPreset?: TimePreset;
}>;

const validDate = (value: string | null): value is string => !!value && ISO_DATE.test(value) && !Number.isNaN(fromQueryDate(value).getTime());

function timeFromParams(params: URLSearchParams, preset: TimePreset): TimeRangeValue {
  const from = params.get("from"), to = params.get("to"), month = presetValue(preset);
  if (!validDate(from) || !validDate(to) || from > to) return month;
  return from === month.from && to === month.to ? month : customRange(from, to);
}

function readParams<E extends Record<string, string>>(params: URLSearchParams, defaults: E, options: ReportFilterOptions<E>): ReportFilterValues<E> {
  const zoneIds = [...new Set((params.get("zones") ?? "").split(",").filter((id) => GUID.test(id)))].slice(0, MAX_ZONES);
  const extra = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof E & string)[]) {
    const value = params.get(key);
    if (value === null || value.length > MAX_EXTRA_LENGTH) continue;
    const allowed = options.allowed?.[key];
    if (allowed && !allowed.includes(value)) continue;
    if (options.guidKeys?.includes(key) && value !== "" && !GUID.test(value)) continue;
    (extra as Record<string, string>)[key] = value;
  }
  return { time: timeFromParams(params, options.defaultPreset ?? "thisMonth"), zoneIds, extra };
}

function writeParams<E extends Record<string, string>>(values: ReportFilterValues<E>, defaults: E): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  for (const key of ["from", "to", "zones", ...Object.keys(defaults)]) params.delete(key);
  if (values.time.from) params.set("from", values.time.from);
  if (values.time.to) params.set("to", values.time.to);
  if (values.zoneIds.length) params.set("zones", values.zoneIds.join(","));
  for (const [key, value] of Object.entries(values.extra)) if (value && value !== defaults[key]) params.set(key, value);
  return params;
}

/**
 * Bộ lọc báo cáo kiểu "nháp -> Áp dụng": người dùng chỉnh `draft`, chỉ khi bấm "Xem báo cáo" (`apply`) thì `applied` đổi và màn gọi API.
 * `applied` được ghi lên query string (from, to, zones và các tiêu chí riêng) để F5 hoặc gửi link vẫn giữ bộ lọc; giá trị lạ trên URL bị bỏ.
 * `query` là from/to đầy đủ (Toàn thời gian = 5 năm gần nhất) để gửi cho API; `zoneIds` rỗng nghĩa là mọi vùng được phép.
 */
export function useReportFilters<E extends Record<string, string>>(defaults: E, options: ReportFilterOptions<E> = {}) {
  const params = useSearchParams();
  const [initial] = useState(() => readParams(params, defaults, options));
  const [draft, setDraft] = useState<ReportFilterValues<E>>(initial);
  const [applied, setApplied] = useState<ReportFilterValues<E>>(initial);
  const problem = draft.time.from && draft.time.to && draft.time.from > draft.time.to ? "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." : null;
  const query = useMemo(() => boundedRange(applied.time, businessToday(), 5), [applied.time]);

  const change = useCallback((patch: Partial<ReportFilterValues<E>> | { extra: Partial<E> }) => setDraft((current) => ({
    ...current, ...patch, extra: "extra" in patch ? { ...current.extra, ...patch.extra } : current.extra,
  }) as ReportFilterValues<E>), []);
  const commit = useCallback((next: ReportFilterValues<E>) => {
    setApplied(next);
    const qs = writeParams(next, defaults).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [defaults]);
  return {
    draft, applied, problem, query, change,
    apply: () => { if (!problem) commit(draft); },
    /** Áp dụng ngay một thay đổi không cần chờ (ví dụ cách gộp) cho cả bản nháp lẫn bản đã áp dụng. */
    applyNow: (extra: Partial<E>) => { setDraft((current) => ({ ...current, extra: { ...current.extra, ...extra } })); commit({ ...applied, extra: { ...applied.extra, ...extra } }); },
    reset: () => { const fresh: ReportFilterValues<E> = { time: presetValue(options.defaultPreset ?? "thisMonth"), zoneIds: [], extra: defaults }; setDraft(fresh); commit(fresh); },
  };
}

"use client";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { workspaceError } from "@/features/api-workspace/workspace-error";

function operationError(result: Exclude<WorkspaceResult<unknown>, { status: "success" }>) {
  if (result.httpStatus === 401 && result.uncertain) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại và đối chiếu kết quả trước khi lập lượt mới.";
  const messages: Record<string, string> = { MSG41: "Số tiền phải là bội số của 1.000 đồng.", MSG45: "Số tiền hoặc số lượng vượt mức cho phép. Hãy đối chiếu số còn nợ hoặc số còn được trả.",
    MSG59: "Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân; đơn giá phải là số nguyên không âm.", MSG61: "Trạng thái hiện tại không cho phép thao tác này. Hãy tải dữ liệu mới để kiểm tra.",
    MSG28: "Ngưỡng tối thiểu phải nhỏ hơn ngưỡng tối đa.", MSG05: "Chưa thể xử lý tệp. Hãy kiểm tra kết quả trước khi tải lại.", MSG04: "Dịch vụ chưa phản hồi. Hãy kiểm tra bản ghi đã lưu trước khi thử lại." };
  return result.code && messages[result.code] || workspaceError(result);
}

export const control = "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 py-2 font-normal";
export function Field({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return <label className="block text-sm font-semibold">{label}<input {...props} className={control} /></label>;
}
export function Select({ label, children, ...props }: ComponentProps<"select"> & { label: string }) {
  return <label className="block text-sm font-semibold">{label}<select aria-label={label} {...props} className={control}>{children}</select></label>;
}
export function Note({ label, ...props }: ComponentProps<"textarea"> & { label: string }) {
  return <label className="block text-sm font-semibold">{label}<textarea {...props} className={control} rows={3} /></label>;
}
export function ErrorNotice({ error }: { error?: string }) { return error ? <p role="alert" className="my-4 rounded-control border border-danger bg-surface p-4 text-danger">{error}</p> : null; }
export function Skeleton() { return <div role="status" aria-label="Đang tải dữ liệu" className="my-5 space-y-3">{[1, 2, 3].map((id) => <div key={id} className="h-14 animate-pulse rounded-control bg-slate-200" />)}</div>; }
export function Money({ value }: { value: number | null | undefined }) { return <>{value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}{value == null ? "" : " ₫"}</>; }
export const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value) + " ₫";
export function businessToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function businessTime(value: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
  return parts.replace(" ", "T");
}
export const toApiTime = (value: string) => value ? `${value.length === 16 ? value + ":00" : value}+07:00` : null;
export const displayTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export const statusLabel = (value: string | number) => ({ "1701": "Nháp", "1702": "Hoàn thành", "1703": "Đã hủy", "1801": "Đã ghi nhận", "1802": "Đã hủy", DRAFT: "Nháp", CONFIRMED: "Đã xác nhận", SUPERSEDED: "Đã hiệu chỉnh", CORRECTED: "Đã hiệu chỉnh", VOIDED: "Đã hủy", Active: "Đang cảnh báo", None: "Không", Corrected: "Đã hiệu chỉnh", Voided: "Đã hủy" }[String(value)] ?? String(value));
export const methodLabel = (value: string) => ({ Cash: "Tiền mặt", BankTransfer: "Chuyển khoản", Other: "Khác" }[value] ?? value);
export function MethodOptions() { return <><option value="Cash">Tiền mặt</option><option value="BankTransfer">Chuyển khoản</option><option value="Other">Khác</option></>; }
export function DataTable({ headings, children, empty }: { headings: string[]; children: ReactNode; empty?: boolean }) {
  return <div className="my-5 overflow-x-auto rounded-card border border-border bg-surface"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-primary-soft"><tr>{headings.map((title) => <th key={title} className="whitespace-nowrap p-3">{title}</th>)}</tr></thead>
    <tbody className="[&_td]:p-3 [&_tr]:border-b [&_tr]:border-border">{children}</tbody></table>{empty && <p className="p-5 text-text-muted">Không có dữ liệu phù hợp.</p>}</div>;
}
export function Paging({ page, total, pageSize = 20, disabled, onChange }: { page: number; total: number; pageSize?: number; disabled?: boolean; onChange(page: number): void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><p>{total} bản ghi · Trang {page}</p><div className="flex gap-2"><Button className="w-auto" variant="secondary" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Trước</Button>
    <Button className="w-auto" variant="secondary" disabled={disabled || page * pageSize >= total} onClick={() => onChange(page + 1)}>Sau</Button></div></div>;
}
export function useRemote<T>(loader: (signal: AbortSignal) => Promise<WorkspaceResult<T>>) {
  const [data, setData] = useState<T>(), [error, setError] = useState<string>(), [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true); setError(undefined); setData(undefined);
      return loader(controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") setData(result.data); else setError(operationError(result));
      });
    });
    return () => controller.abort();
  }, [loader, version]);
  return { data, error, loading, reload: () => setVersion((current) => current + 1) };
}
export function useMutation() {
  const [pending, setPending] = useState(false), [error, setError] = useState<string>(), [blocked, setBlocked] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const active = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run<T>(action: () => Promise<WorkspaceResult<T>>, readOnly = false): Promise<T | undefined> {
    if (active.current || blocked && !readOnly) return undefined;
    active.current = true; setPending(true); setError(undefined);
    let result: WorkspaceResult<T>;
    try { result = await action(); } catch { result = { status: "error", httpStatus: 0, uncertain: !readOnly }; }
    active.current = false;
    if (!mounted.current) return undefined;
    setPending(false);
    if (result.status === "success") return result.data;
    setError(operationError(result));
    if (!readOnly) { setBlocked(result.uncertain || result.code === "MSG06"); if (result.uncertain) setUncertain(true); }
    return undefined;
  }
  return { pending, error, blocked, uncertain, run, busy: () => active.current, reviewed: () => { if (!active.current) { setBlocked(false); setError(undefined); } } };
}

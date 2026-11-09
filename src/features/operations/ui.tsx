"use client";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/ui/data-grid";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import { ManagementHeading } from "@/components/ui/management-page";
import type { InterfaceIconName } from "@/components/ui/interface-icon";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { workspaceError } from "@/features/api-workspace/workspace-error";

export function operationError(result: Exclude<WorkspaceResult<unknown>, { status: "success" }>) {
  if (result.httpStatus === 401 && result.uncertain) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại và đối chiếu kết quả trước khi lập lượt mới.";
  const messages: Record<string, string> = { MSG41: "Số tiền phải là bội số của 1.000 đồng.", MSG45: "Số tiền hoặc số lượng vượt mức cho phép. Hãy đối chiếu số còn nợ hoặc số còn được trả.",
    "MSG-SALE-13": "Chưa dùng được VietQR vì hợp tác xã chưa có tài khoản nhận tiền. Hãy chọn cách thanh toán khác và nhờ Chủ hợp tác xã thiết lập tài khoản.",
    "MSG-SALE-14": "Chuyển khoản chưa về. Dừng giao dịch này? Hóa đơn không được lưu, mã chỉ giữ trong nhật ký. Hãy trả lại tiền mặt đã nhận (nếu có) và giữ nguyên hàng.",
    "MSG-SALE-20": "Hóa đơn đã có phiếu trả hàng nên không thể sửa hoặc hủy.",
    "MSG-SALE-21": "Hóa đơn khách lẻ không có hồ sơ khách hàng nên không thể tăng tổng tiền. Hãy lập hóa đơn mới cho phần hàng thêm.",
    "MSG-CLAIM-03": "Hóa đơn đã bị hủy hoặc đã trả hàng nên chưa thể chấp nhận khiếu nại này.",
    "MSG-PURCHASE-05": "Khoản chi vượt công nợ hiện tại. Hãy đối chiếu và xác nhận phần trả trước nếu muốn tiếp tục.",
    "MSG-PURCHASE-06": "Mã giao dịch ngân hàng đã được ghi nhận. Hãy đối chiếu trước khi xác nhận dùng lại mã này.",
    "MSG-GEN-09": "Trạng thái hiện tại không cho phép thao tác. Hãy đọc dữ liệu mới để đối chiếu.",
    MSG59: "Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân; đơn giá phải là số nguyên không âm.", MSG61: "Trạng thái hiện tại không cho phép thao tác này. Hãy tải dữ liệu mới để kiểm tra.",
    MSG28: "Ngưỡng tối thiểu phải nhỏ hơn ngưỡng tối đa.", MSG05: "Chưa thể xử lý tệp. Hãy kiểm tra kết quả trước khi tải lại.", MSG04: "Dịch vụ chưa phản hồi. Hãy kiểm tra bản ghi đã lưu trước khi thử lại." };
  return result.code && messages[result.code] || workspaceError(result);
}

export const control = "mt-1.5 min-h-11 lg:min-h-10 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm font-normal text-text transition-colors hover:border-primary/60 focus:border-primary";
export function OperationHeading({ title, description, icon, children }: { title: string; description: string; icon: InterfaceIconName; children?: ReactNode }) {
  return <ManagementHeading title={title} description={description} icon={icon}>{children}</ManagementHeading>;
}
export function FilterPanel({ children, columns = "four" }: { children: ReactNode; columns?: "two" | "three" | "four" }) {
  const grid = columns === "two" ? "sm:grid-cols-2" : columns === "three" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  return <div className={`grid items-end gap-3 rounded-card border border-border bg-[#fafbf9] p-3.5 ${grid}`}>{children}</div>;
}
export function Field({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  if (props.type === "date") {
    const { type: _type, value, min, max, onChange, ref, ...input } = props;
    void _type;
    return <div className="block text-xs font-medium text-text-muted"><span>{label}</span><VietnameseDateInput {...input} aria-label={label} value={String(value ?? "")} min={min == null ? undefined : String(min)} max={max == null ? undefined : String(max)} inputRef={ref} className={control} calendarLabel={`Chọn ${label.toLocaleLowerCase("vi")}`} onValueChange={value => onChange?.({ target: { value }, currentTarget: { value } } as React.ChangeEvent<HTMLInputElement>)} /></div>;
  }
  return <label className="block text-xs font-medium text-text-muted">{label}<input {...props} className={control} /></label>;
}
export function Select({ label, children, ...props }: ComponentProps<"select"> & { label: string }) {
  return <label className="block text-xs font-medium text-text-muted">{label}<select aria-label={label} {...props} className={control}>{children}</select></label>;
}
export function Note({ label, ...props }: ComponentProps<"textarea"> & { label: string }) {
  return <label className="block text-xs font-medium text-text-muted">{label}<textarea {...props} className={control} rows={3} /></label>;
}
export function ErrorNotice({ error }: { error?: string }) { return error ? <p role="alert" className="my-4 rounded-control border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p> : null; }
export function Skeleton() { return <div role="status" aria-label="Đang tải dữ liệu" className="my-5 space-y-3">{[1, 2, 3].map((id) => <div key={id} className="omts-skeleton h-14 rounded-control" />)}</div>; }
export function Money({ value }: { value: number | null | undefined }) { return <span data-currency>{value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}{value == null ? "" : " ₫"}</span>; }
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
export function DataTable({ headings, children, empty, responsive }: { headings: string[]; children: ReactNode; empty?: boolean; responsive?: boolean }) {
  return <div className="my-4"><DataGrid headings={headings} empty={empty} responsive={responsive}>{children}</DataGrid></div>;
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
  const [failure, setFailure] = useState<Exclude<WorkspaceResult<unknown>, { status: "success" }>>();
  const active = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run<T>(action: () => Promise<WorkspaceResult<T>>, readOnly = false): Promise<T | undefined> {
    if (active.current || blocked && !readOnly) return undefined;
    active.current = true; setPending(true); setError(undefined); setFailure(undefined);
    let result: WorkspaceResult<T>;
    try { result = await action(); } catch { result = { status: "error", httpStatus: 0, uncertain: !readOnly }; }
    active.current = false;
    if (!mounted.current) return undefined;
    setPending(false);
    if (result.status === "success") return result.data;
    setError(operationError(result)); setFailure(result);
    if (!readOnly) { setBlocked(result.uncertain || result.code === "MSG06" || result.code === "MSG-GEN-06"); if (result.uncertain) setUncertain(true); }
    return undefined;
  }
  return { pending, error, failure, blocked, uncertain, run, busy: () => active.current, reviewed: () => { if (!active.current) { setBlocked(false); setError(undefined); setFailure(undefined); } } };
}

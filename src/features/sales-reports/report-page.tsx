"use client";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { ExportMenu, type ExportFormat } from "./export-menu";
import s from "./report-live.module.css";

export type ReportView = "chart" | "table";

type ReportPageProps = Readonly<{
  /** Khoá nhớ trạng thái đóng/mở cột lọc, và tên vùng lọc cho trình đọc màn hình. */
  storageKey: string; icon: InterfaceIconName; title: string; filterLabel: string;
  filters: ReactNode;
  /** Không có quyền xem: chỉ hiện thông báo, không gọi API. */
  canView: boolean;
  /** Ô tìm trong nhóm đang xem; bỏ trống thì ô tìm hiện ở dạng không hoạt động. */
  search?: Readonly<{ value: string; placeholder: string; onChange(value: string): void }>;
  /** Xuất Excel: không truyền thì không hiện nút. `exportError` hiện thành thông báo nổi. */
  onExport?: () => void; exporting?: boolean; exportError?: string;
  /** Tải xuống chọn định dạng (PDF / Excel): thay cho nút "Xuất file" khi có. */
  onExportFormat?: (format: ExportFormat) => void;
  /** Nút bên cạnh "Xuất file" (ví dụ chọn cột). */
  extraActions?: ReactNode;
  /** Trạng thái dữ liệu chính: `loading` chỉ là skeleton cho lần tải đầu (chưa có `hasData`). */
  loading: boolean; error?: string; onRetry?: () => void; hasData: boolean;
  /** Thông báo khi báo cáo rỗng (ví dụ MSG-GEN-10 từ backend); khi có, chỉ hiện thông báo này thay cho nội dung. */
  emptyMessage?: string;
  children: ReactNode;
}>;

/**
 * Khung màn báo cáo có số liệu thật: ManagementLayout (cột lọc trái, ngăn kéo khi hẹp), nút Xuất file, và các trạng thái
 * không quyền / đang tải lần đầu / lỗi (có Thử lại) / rỗng. Nội dung (ô chỉ số, biểu đồ, bảng) do màn truyền vào `children`.
 */
export function ReportPage({ storageKey, icon, title, filterLabel, filters, canView, search, onExport, onExportFormat, exporting, exportError, extraActions, loading, error, onRetry, hasData, emptyMessage, children }: ReportPageProps) {
  const { notify } = useToast();
  useEffect(() => { if (exportError) notify({ tone: "danger", title: `Chưa xuất được báo cáo ${title.toLocaleLowerCase("vi")}.`, description: exportError }); }, [exportError, notify, title]);
  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn chưa có quyền xem báo cáo này. Hãy liên hệ Chủ hợp tác xã để được cấp quyền.</p>;
  return (
    <ManagementLayout storageKey={storageKey} icon={icon} title={title} filterLabel={filterLabel} filters={filters}
      search={search && <input type="search" aria-label="Tìm trong bảng" placeholder={search.placeholder} maxLength={200} value={search.value} onChange={(event) => search.onChange(event.target.value)} />}
      actions={<>
        {onExportFormat && <ExportMenu onPick={onExportFormat} pending={exporting} disabled={loading || !hasData} />}
        {!onExportFormat && onExport && <Button className="w-auto" variant="secondary" isPending={exporting} disabled={loading || !hasData} onClick={onExport}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
        {extraActions}
        <HelpLink />
      </>}>
      <ManagementScroller busy={loading}>
        <div aria-live="polite" className={s.body}>
          {loading && !hasData && <ListSkeleton />}
          {error && <ListStateMessage error={error} onRetry={onRetry} />}
          {!error && hasData && emptyMessage && <ListStateMessage>{emptyMessage}</ListStateMessage>}
          {!error && hasData && !emptyMessage && children}
        </div>
      </ManagementScroller>
    </ManagementLayout>
  );
}

/** Nút chuyển "Xem theo: Biểu đồ | Bảng" (KiotViet). */
export function ReportViewToggle({ view, onChange }: Readonly<{ view: ReportView; onChange(view: ReportView): void }>) {
  return (
    <div className={s.pills} role="group" aria-label="Xem theo">
      {([["chart", "Biểu đồ"], ["table", "Bảng"]] as const).map(([key, text]) => <button key={key} type="button" className={s.pill} aria-pressed={view === key} onClick={() => onChange(key)}>{text}</button>)}
    </div>
  );
}

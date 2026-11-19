"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { listCollectors } from "@/features/cash-book/repository";
import { businessToday, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { endOfDayMethods, type EndOfDayMethod } from "./end-of-day-contracts";
import { FUND_LABEL, PRINT_CSS } from "./end-of-day-parts";
import styles from "./end-of-day-report.module.css";
import { GoodsSection, MoneySection, SalesSection } from "./end-of-day-sections";
import { ReportChoice, ReportFilterRail, useReportZones } from "./report-filter-rail";
import { ReportPage } from "./report-page";
import { useEndOfDayReport, type EndOfDayFilters } from "./use-end-of-day-report";

const METHOD_OPTIONS: readonly (readonly [string, string])[] = [["", "Tất cả"], ...endOfDayMethods.map((method) => [method, FUND_LABEL[method]] as const)];
const EMPTY_DAY_MESSAGE = "Không có giao dịch nào trong ngày đã chọn. Hãy chọn ngày hoặc bộ lọc khác.";

/** Báo cáo Cuối ngày: bán hàng, thu chi và hàng hóa của một ngày, lọc theo vùng, quỹ thanh toán và người lập; in được và tải xuống PDF hoặc Excel. */
export function EndOfDayReportScreen() {
  const [initial] = useState<EndOfDayFilters>(() => ({ date: businessToday(), zoneIds: [], method: "", createdBy: "" }));
  const [draft, setDraft] = useState(initial), [applied, setApplied] = useState(initial);
  const zones = useReportZones("end-of-day-report");
  const people = useRemote(useCallback((signal: AbortSignal) => listCollectors(signal), []));
  const today = businessToday();
  const eod = useEndOfDayReport(applied);
  const { report } = eod, data = report.data;
  const problem = !draft.date ? "Hãy chọn ngày cần xem." : draft.date > today ? "Chưa thể xem báo cáo của ngày trong tương lai." : null;
  const empty = !!data && (data.messageCode === "MSG-GEN-10" || !data.sales.invoices.length && !data.sales.returns.length && !data.money.entries.length && !data.goods.products.length && !data.goods.lots.length);
  return (
    <ReportPage storageKey="end-of-day-report" icon="document" title="Cuối ngày" filterLabel="Bộ lọc báo cáo cuối ngày" canView={eod.canView}
      filters={<ReportFilterRail zoneIds={draft.zoneIds} onZones={(zoneIds) => setDraft({ ...draft, zoneIds })} zones={zones} problem={problem} busy={report.loading}
        onApply={() => setApplied(draft)} onReset={() => { setDraft(initial); setApplied(initial); }}
        lead={<FilterGroup legend="Ngày"><DatePickerField label="Ngày báo cáo" value={draft.date} max={today} onChange={(date) => setDraft({ ...draft, date })} /></FilterGroup>}>
        <ReportChoice legend="Phương thức thanh toán" value={draft.method} options={METHOD_OPTIONS} onChange={(method) => setDraft({ ...draft, method: method as "" | EndOfDayMethod })} />
        <FilterGroup legend="Người lập">
          <PersonPicker label="Người lập" people={people.data ?? []} value={draft.createdBy} placeholder="Tất cả" disabled={people.loading || !!people.error} onChange={(createdBy) => setDraft({ ...draft, createdBy })} />
          {draft.createdBy && <button type="button" className="text-left text-xs text-primary underline" onClick={() => setDraft({ ...draft, createdBy: "" })}>Bỏ chọn người lập</button>}
        </FilterGroup>
      </ReportFilterRail>}
      onExportFormat={eod.canExport ? eod.exportFile : undefined} exporting={eod.exporting} exportError={eod.exportError}
      extraActions={<Button className="w-auto" variant="secondary" disabled={!data || empty} onClick={() => window.print()}><InterfaceIcon name="document" className="mr-1 size-4" />In</Button>}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data} emptyMessage={empty ? EMPTY_DAY_MESSAGE : undefined}>
      {data && <div className={styles.printArea} data-end-of-day-print>
        <style>{PRINT_CSS}</style>
        <h2 className={styles.title}>Báo cáo cuối ngày {formatVietnameseDate(data.date)}</h2>
        <SalesSection sales={data.sales} />
        <MoneySection money={data.money} />
        <GoodsSection goods={data.goods} />
      </div>}
    </ReportPage>
  );
}

"use client";
import { WaterZoneOverview } from "@/features/water-overview/water-zone-overview";
import { FilterChecks } from "@/components/ui/filter-checks";
import { readSelectionPages } from "./selection-pages";
import { selectionQueries } from "@/shared/presentation/filter-selection";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import styles from "./water-screen.module.css";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "./permissions";
import * as c from "./contracts";
import type { Query } from "./repository";
import { loadOptions } from "./lookups";
import { ErrorNotice, Field, OperationHeading, Select, Skeleton, useMutation, useRemote } from "./ui";
import { WaterHistoryTable } from "./water-history-table";
import { MeasurementEditor } from "./water-measurement-editor";
import {
  waterRepository as repository,
  type WaterChartData,
  type WaterRecognition,
} from "./water-measurement-shared";
import { NewMeasurement } from "./water-new-measurement-dialog";
import { WaterQualityChart } from "./water-quality-chart";
import { ThresholdDialog } from "./water-threshold-dialog";

// Re-exported so existing imports from "./water-screen" keep working.
export { MeasurementEditor } from "./water-measurement-editor";
export { NewMeasurement } from "./water-new-measurement-dialog";

const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);

const STATUS_FILTER_OPTIONS: [string, string][] = [
  ["Confirmed", "Đã xác nhận"],
  ["Draft", "Nháp"],
  ["Corrected", "Đã hiệu chỉnh"],
  ["Voided", "Đã hủy"],
];

/** The API expects an empty status for "all"; the UI keeps "All" as its own sentinel. */
function toStatusSelection(status: string) {
  return { status: status === "All" ? "" : status };
}

export function WaterScreen({ initialZoneId = "" }: { initialZoneId?: string } = {}) {
  const context = useApiWorkspace();
  const zones = useRemote(loadZones);
  const [zoneId, setZoneId] = useState(initialZoneId);
  const [filters, setFilters] = useState({ from: "", to: "", status: "Confirmed" });
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState("month");
  // undefined = nothing selected; null = creating a new measurement; record = selected measurement.
  const [selected, setSelected] = useState<c.WaterMeasurement | null>();
  const [serial, setSerial] = useState(0);
  const [ocr, setOcr] = useState<WaterRecognition>();
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [fullDetail, setFullDetail] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const query = useMemo<Query>(
    () => ({ ...filters, zoneId, page: String(page), pageSize: String(pageSize) }),
    [filters, zoneId, page, pageSize],
  );
  const history = useRemote(useMemo(() => (signal: AbortSignal) => zoneId
    ? readSelectionPages(
      (params, signal) => repository.read("list", { ...params, status: params.status ?? "All" }, c.waterHistorySchema, signal),
      query,
      toStatusSelection(filters.status),
      signal,
      (a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)),
    )
    : Promise.resolve({ status: "success" as const, data: undefined as c.WaterHistory | undefined }), [query, zoneId, filters.status]));
  const chart = useRemote(useMemo(() => (signal: AbortSignal) => zoneId
    ? repository.read("chart", { zoneId, from: filters.from, to: filters.to, groupBy }, c.waterChartSchema, signal)
    : Promise.resolve({ status: "success" as const, data: undefined as WaterChartData | undefined }), [zoneId, filters.from, filters.to, groupBy]));
  const mutation = useMutation();
  const permissions = context.permissions.functionPermissions;
  const availableZones = zones.data?.filter((row) => operationAllowed("water", context.identity, permissions, "View", row.id)) ?? [];
  const currentZone = availableZones.find((row) => row.id === zoneId);
  const canExport = zoneId && operationAllowed("water", context.identity, permissions, "Export", zoneId);

  async function open(id: string) {
    const result = await mutation.run(() => repository.read("detail", { id }, c.waterSchema), true);
    if (result) {
      setSelected(result);
      setOcr(undefined);
      setSerial((value) => value + 1);
    }
  }
  function saved(record: c.WaterMeasurement, recognized?: WaterRecognition) {
    setSelected(record);
    setOcr(recognized);
    setSerial((value) => value + 1);
    history.reload();
    chart.reload();
    setNotice("Đã lưu phép đo.");
  }
  function toggleRow(id: string) {
    setFullDetail(false);
    if (selected?.id === id) setSelected(undefined);
    else void open(id);
  }
  function exportExcel() {
    const queries = selectionQueries(query, toStatusSelection(filters.status))
      .map((params) => ({ ...params, status: params.status ?? "All" }));
    void mutation.run(() => repository.downloadMany(queries), true);
  }
  function updateDateFilter(key: "from" | "to", value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelected(undefined);
  }

  const zoneFilters = <>
    <Select label="Vùng nuôi *" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setPage(1); setSelected(undefined); setFullDetail(false); }}>
      <option value="">Chọn vùng được cấp</option>
      {availableZones.map((row) => (
        <option key={row.id} value={row.id}>{String(row.name)}{row.statusId === 102 ? " (ngừng dùng)" : ""}</option>
      ))}
    </Select>
    <Field label="Từ ngày" type="date" value={filters.from} onChange={(e) => updateDateFilter("from", e.target.value)} />
    <Field label="Đến ngày" type="date" value={filters.to} onChange={(e) => updateDateFilter("to", e.target.value)} />
    <FilterChecks
      label="Trạng thái"
      value={filters.status === "All" ? "" : filters.status}
      options={STATUS_FILTER_OPTIONS}
      onChange={(value) => { setFilters((current) => ({ ...current, status: value })); setPage(1); setSelected(undefined); }}
    />
  </>;

  return <section className={styles.page}>
    <OperationHeading
      title="Theo dõi chất lượng nước"
      description="Xem số đo, ngưỡng an toàn và cảnh báo. Ghi nhận phép đo trên ứng dụng điện thoại."
      icon="waves"
    >
      <div className="flex flex-wrap gap-2">
        <Button className="w-auto" variant="secondary" disabled={!zoneId || mutation.pending} onClick={() => setThresholdsOpen(true)}>Ngưỡng nước</Button>
        {canExport && (
          <Button className="w-auto" variant="secondary" disabled={mutation.pending || filters.status === "-"} onClick={exportExcel}>Xuất Excel</Button>
        )}
      </div>
    </OperationHeading>
    <FilterWorkspace label="Vùng và thời gian" filters={zoneFilters}>
      <ErrorNotice error={zones.error || history.error || mutation.error} />
      {notice && <p role="status" className="mt-4 text-primary">{notice}</p>}
      {zones.error && (
        <Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending || zones.loading} onClick={zones.reload}>Tải lại danh sách vùng</Button>
      )}
      {!zoneId ? <WaterZoneOverview onSelectZone={(id) => { setZoneId(id); setPage(1); setSelected(undefined); }} /> : <>
        <div className={styles.zoneHeading}>
          <div>
            <span>VÙNG ĐANG THEO DÕI</span>
            <h2>{String(currentZone?.name ?? "Vùng nuôi")}</h2>
            <p>Mặc định: lịch sử 3 tháng gần đây, biểu đồ 12 tháng · giờ Việt Nam</p>
          </div>
          <Button variant="secondary" disabled={history.loading} onClick={() => { history.reload(); chart.reload(); }}>Tải lại dữ liệu</Button>
        </div>
        <section aria-labelledby="water-chart-heading" className="mt-7 border-t border-border pt-4">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="water-chart-heading" className="text-base font-semibold tracking-tight">Xu hướng chất lượng nước</h2>
              <p className="mt-1 text-xs text-text-muted">Chỉ số đã xác nhận, so với ngưỡng hiện hành</p>
            </div>
            <div className="w-full sm:w-44">
              <Select label="Khoảng gộp" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="month">Theo tháng</option>
                <option value="day">Theo ngày</option>
              </Select>
            </div>
          </div>
          <ErrorNotice error={chart.error} />
          {chart.loading ? <Skeleton /> : chart.data && <WaterQualityChart data={chart.data} />}
        </section>
        <section aria-labelledby="water-history-heading" className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="water-history-heading" className="text-base font-semibold tracking-tight">Lịch sử phép đo</h2>
            {history.data && <p className="text-xs text-text-muted">{history.data.total} bản ghi</p>}
          </div>
          {history.loading ? <Skeleton /> : history.data && (
            <WaterHistoryTable
              history={history.data}
              selected={selected}
              disabled={mutation.pending}
              page={page}
              pageSize={pageSize}
              onToggleRow={toggleRow}
              onFullDetail={() => setFullDetail(true)}
              onPageChange={(next) => { setPage(next); setSelected(undefined); }}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); setSelected(undefined); }}
            />
          )}
        </section>
      </>}
    </FilterWorkspace>
    {selected !== undefined && (selected
      ? fullDetail && (
        <MeasurementEditor
          readOnly
          key={`${selected.id}:${serial}`}
          record={selected}
          ocr={ocr}
          onClose={() => setFullDetail(false)}
          onSaved={saved}
          onOpen={open}
        />
      )
      : (
        <NewMeasurement
          key={`new:${serial}`}
          zoneId={zoneId}
          zoneName={String(currentZone?.name ?? "")}
          onClose={() => setSelected(undefined)}
          onSaved={saved}
        />
      ))}
    {thresholdsOpen && (
      <ThresholdDialog
        zoneId={zoneId}
        owner={context.identity.subjectType === "CooperativeOwner"}
        onClose={() => setThresholdsOpen(false)}
        onSaved={() => {
          chart.reload();
          setThresholdsOpen(false);
          setNotice("Đã lưu ngưỡng nước. Ngưỡng mới áp dụng cho các phép đo xác nhận sau đó.");
        }}
      />
    )}
  </section>;
}

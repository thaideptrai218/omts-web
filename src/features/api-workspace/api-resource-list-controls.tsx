"use client";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { countNounFor } from "./api-resource-presentation";
import type { ResourceKey } from "./resources";
import type { ApiPage } from "./workspace-repository";

/** Record count plus the grid/table toggle shown above the zone and raft lists. */
export function ResourceViewToggle({
  resource,
  total,
  view,
  onViewChange,
}: {
  resource: ResourceKey;
  total: number;
  view: "grid" | "table";
  onViewChange(view: "grid" | "table"): void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-muted">
        {total} {resource === "zones" ? "vùng nuôi" : "bè nuôi"}
      </p>
      <div
        className="flex gap-1 rounded-control border border-border bg-surface-subtle p-1"
        role="group"
        aria-label="Cách hiển thị danh sách"
      >
        <Button
          className="size-9 w-auto p-0"
          title="Dạng lưới"
          aria-label="Dạng lưới"
          variant={view === "grid" ? "primary" : "secondary"}
          aria-pressed={view === "grid"}
          onClick={() => onViewChange("grid")}
        >
          <InterfaceIcon name="grid" />
        </Button>
        <Button
          className="size-9 w-auto p-0"
          title="Dạng bảng"
          aria-label="Dạng bảng"
          variant={view === "table" ? "primary" : "secondary"}
          aria-pressed={view === "table"}
          onClick={() => onViewChange("table")}
        >
          <InterfaceIcon name="list" />
        </Button>
      </div>
    </div>
  );
}

/** "N … · Trang x/y", page size select and previous/next buttons. */
export function ResourcePager({
  resource,
  page,
  pageNumber,
  pageSize,
  loading,
  onPageSizeChange,
  onPrevious,
  onNext,
}: {
  resource: ResourceKey;
  page: ApiPage;
  pageNumber: number;
  pageSize: number;
  loading: boolean;
  onPageSizeChange(size: number): void;
  onPrevious(): void;
  onNext(): void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p>
        {page.total} {countNounFor(resource)} · Trang {page.page}/{Math.max(1, Math.ceil(page.total / page.pageSize))}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Số dòng/trang{" "}
          <select
            className="ml-2 rounded-control border border-border px-2 py-2"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <Button className="w-auto" variant="secondary" disabled={loading || pageNumber <= 1} onClick={onPrevious}>
          Trước
        </Button>
        <Button
          className="w-auto"
          variant="secondary"
          disabled={loading || pageNumber * page.pageSize >= page.total}
          onClick={onNext}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

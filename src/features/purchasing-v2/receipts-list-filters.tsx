"use client";
import { FilterChecks } from "@/components/ui/filter-checks";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { Select, type useRemote } from "@/features/operations/ui";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";

/** Receipt list filters; `status` and `group` hold "|"-joined multi-selections ("-" = none ticked). */
export type ReceiptListFilterValues = {
  code: string;
  time: TimeRangeValue;
  status: string;
  supplier: string;
  raft: string;
  group: string;
};

export const emptyReceiptListFilters: ReceiptListFilterValues = {
  code: "",
  time: allTime,
  status: "",
  supplier: "",
  raft: "",
  group: "",
};

type RemoteOptions<T> = Pick<ReturnType<typeof useRemote<T[]>>, "data" | "loading" | "error">;
type RaftOption = { id: string; code: string; zoneCode: string };

/** Side-panel filters: period, item group, raft, supplier and receipt status. */
export function ReceiptsListFilters({
  filters,
  onChange,
  supplierOptions,
  raftOptions,
}: {
  filters: ReceiptListFilterValues;
  onChange(changes: Partial<ReceiptListFilterValues>): void;
  supplierOptions: RemoteOptions<ApiRecord>;
  raftOptions: RemoteOptions<RaftOption>;
}) {
  return (
    <>
      <TimeRangeFilter legend="Thời gian" value={filters.time} onChange={(time) => onChange({ time })} />
      <FilterChecks
        label="Nhóm hàng"
        value={filters.group}
        options={[
          ["Seed", "Giống"],
          ["Material", "Vật tư"],
          ["Other", "Khác"],
        ]}
        onChange={(value) => onChange({ group: value })}
      />
      <Select
        label="Bè sử dụng"
        disabled={raftOptions.loading || !!raftOptions.error}
        value={filters.raft}
        onChange={(e) => onChange({ raft: e.target.value })}
      >
        <option value="">Tất cả bè</option>
        {raftOptions.data?.map((v) => (
          <option key={v.id} value={v.id}>
            {v.zoneCode} · {v.code}
          </option>
        ))}
      </Select>
      <Select
        label="Nhà cung cấp"
        disabled={supplierOptions.loading || !!supplierOptions.error}
        value={filters.supplier}
        onChange={(e) => onChange({ supplier: e.target.value })}
      >
        <option value="">Tất cả nhà cung cấp</option>
        {supplierOptions.data?.map((v) => (
          <option key={v.id} value={v.id}>
            {String(v.name)}
          </option>
        ))}
      </Select>
      <FilterChecks
        label="Trạng thái phiếu"
        value={filters.status}
        options={[
          ["1701", "Nháp"],
          ["1702", "Hoàn thành"],
          ["1703", "Đã hủy"],
        ]}
        onChange={(value) => onChange({ status: value })}
      />
    </>
  );
}

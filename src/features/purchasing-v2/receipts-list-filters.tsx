"use client";
import { FilterChecks } from "@/components/ui/filter-checks";
import { Field, Select, businessToday, type useRemote } from "@/features/operations/ui";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import styles from "./purchasing.module.css";

/** Receipt list filters; `status` and `group` hold "|"-joined multi-selections ("-" = none ticked). */
export type ReceiptListFilterValues = {
  code: string;
  from: string;
  to: string;
  status: string;
  supplier: string;
  raft: string;
  group: string;
};

export const emptyReceiptListFilters: ReceiptListFilterValues = {
  code: "",
  from: "",
  to: "",
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
      <fieldset className={styles.filterGroup}>
        <legend>Thời gian</legend>
        <button
          type="button"
          className={styles.textAction}
          onClick={() => {
            const today = businessToday();
            onChange({ from: `${today.slice(0, 7)}-01`, to: today });
          }}
        >
          Tháng này
        </button>
        <Field label="Từ ngày" type="date" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
        <Field label="Đến ngày" type="date" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
      </fieldset>
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

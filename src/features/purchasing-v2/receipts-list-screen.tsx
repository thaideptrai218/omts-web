"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { ManagementHeading } from "@/components/ui/management-page";
import { loadOptions } from "@/features/operations/lookups";
import {
  DataTable,
  ErrorNotice,
  Field,
  Money,
  Paging,
  Select,
  Skeleton,
  useMutation,
  useRemote,
} from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { loadReceiptRafts, useAccess } from "./purchasing-shared";
import { ReceiptDialog } from "./receipt-dialog";
import { ReceiptListRow } from "./receipt-list-row";
import { emptyReceiptListFilters, ReceiptsListFilters, type ReceiptListFilterValues } from "./receipts-list-filters";
import { downloadSelectedReceipts, readSelectedReceipts } from "./selection-repository";
import styles from "./purchasing.module.css";

const loadSuppliers = (signal: AbortSignal) => loadOptions("suppliers", signal);

/** Purchase receipt list with period/group/raft/supplier/status filters, totals and Excel/ZIP export. */
export function ReceiptsV2Screen() {
  const access = useAccess("purchase-receipts");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<ReceiptListFilterValues>(emptyReceiptListFilters);
  // undefined = dialog closed, null = new receipt, string = receipt id.
  const [selected, setSelected] = useState<string | null>();
  // Id of the row whose inline detail is open.
  const [expanded, setExpanded] = useState<string>();
  const exportFile = useMutation();
  const supplierOptions = useRemote(loadSuppliers);
  const raftOptions = useRemote(loadReceiptRafts);
  const { code, time, status, supplier, raft, group } = filters;
  const query = useMemo(
    () => ({
      page: String(page),
      pageSize: String(pageSize),
      code: code || undefined,
      from: time.from || undefined,
      to: time.to || undefined,
      supplierId: supplier || undefined,
      raftId: raft || undefined,
    }),
    [page, pageSize, code, time.from, time.to, supplier, raft],
  );
  // Status and item group are multi-selections, expanded into several requests by the selection repository.
  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) => readSelectedReceipts(query, { statusId: status, itemGroup: group }, signal),
      [query, status, group],
    ),
  );

  // Every filter change returns to page 1.
  const changeFilters = (changes: Partial<ReceiptListFilterValues>) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  };
  const toggle = (id: string) => setExpanded((v) => (v === id ? undefined : id));

  return (
    <section className={styles.page}>
      <ManagementHeading
        title="Phiếu nhập hàng"
        description="Tra cứu phiếu nhập, nhà cung cấp và hàng dùng cho từng bè."
        icon="receipt"
      >
        {access.allowed("Create") && (
          <Button className="w-auto" onClick={() => setSelected(null)}>
            Nhập hàng
          </Button>
        )}
        {access.allowed("Export") && (
          <Button
            className="w-auto"
            variant="secondary"
            disabled={
              exportFile.pending || remote.loading || !!remote.error || status === "-" || group === "-"
            }
            onClick={() =>
              void exportFile.run(() => downloadSelectedReceipts(query, { statusId: status, itemGroup: group }), true)
            }
          >
            {exportFile.pending ? "Đang xuất…" : "Xuất Excel"}
          </Button>
        )}
      </ManagementHeading>
      <FilterWorkspace
        label="Lọc phiếu nhập"
        filters={
          <ReceiptsListFilters
            filters={filters}
            onChange={changeFilters}
            supplierOptions={supplierOptions}
            raftOptions={raftOptions}
          />
        }
        reset={
          <button
            type="button"
            className={styles.textAction}
            onClick={() => {
              setFilters(emptyReceiptListFilters);
              setPage(1);
            }}
          >
            Đặt lại
          </button>
        }
      >
        {(group.includes("|") || status.includes("|")) && (
          <p className={styles.filterNote}>
            Xuất nhiều lựa chọn sẽ tải một tệp ZIP, gồm các bảng Excel theo nhóm và trạng thái đã tick.
          </p>
        )}
        <div className={styles.searchToolbar}>
          <Field
            label="Tìm phiếu nhập"
            type="search"
            placeholder="Theo mã phiếu nhập"
            value={code}
            onChange={(e) => changeFilters({ code: e.target.value })}
          />
        </div>
        <ErrorNotice error={exportFile.error || supplierOptions.error || raftOptions.error} />
        {(supplierOptions.error || raftOptions.error) && (
          <Button
            variant="secondary"
            onClick={() => {
              supplierOptions.reload();
              raftOptions.reload();
            }}
          >
            Tải lại bộ lọc
          </Button>
        )}

        <ErrorNotice error={remote.error} />
        <div className={styles.listHeading}>
          <div>
            <h2>Danh sách phiếu nhập</h2>
            <p>
              {remote.data
                ? `${remote.data.page.total} phiếu · ${formatVietnameseDate(remote.data.from)} – ${formatVietnameseDate(remote.data.to)}`
                : "Theo khoảng thời gian và trạng thái đã chọn"}
            </p>
          </div>
          <Button variant="secondary" disabled={remote.loading} onClick={remote.reload}>
            Tải lại danh sách
          </Button>
        </div>
        {remote.data && (
          <>
            <dl className={styles.totals}>
              {[
                ["Giá trị nhập", remote.data.totals.receiptsTotal],
                ["Giá trị trả hàng", remote.data.totals.returnsTotal],
                ["Giá trị ròng", remote.data.totals.netTotal],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <Money value={Number(value)} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className={styles.totalNote}>
              Tổng hợp {remote.data.totals.completedCount} phiếu đã hoàn thành trong phạm vi tra cứu.
              {group || raft
                ? " Giá trị tổng hợp chỉ tính các dòng phù hợp bộ lọc; tổng tiền mỗi phiếu vẫn là toàn bộ phiếu."
                : ""}
            </p>
          </>
        )}
        {remote.loading ? (
          <Skeleton />
        ) : remote.error ? null : (
          <DataTable
            responsive
            headings={["Phiếu / ngày nhập", "Nhà cung cấp", "Tổng tiền", "Trạng thái", "Hồ sơ"]}
            empty={!remote.data?.page.items.length}
          >
            {remote.data?.page.items.map((row) => (
              <ReceiptListRow
                key={row.id}
                row={row}
                expanded={expanded === row.id}
                onToggle={() => toggle(row.id)}
                onOpen={() => setSelected(row.id)}
              />
            ))}
          </DataTable>
        )}

        {remote.data && (
          <div className={styles.paging}>
            <Select
              label="Số phiếu mỗi trang"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} phiếu
                </option>
              ))}
            </Select>
            <Paging
              page={remote.data.page.page}
              pageSize={pageSize}
              total={remote.data.page.total}
              disabled={remote.loading}
              onChange={setPage}
            />
          </div>
        )}
      </FilterWorkspace>
      {selected !== undefined && (
        <ReceiptDialog
          id={selected}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            setExpanded(undefined);
            remote.reload();
          }}
        />
      )}
    </section>
  );
}

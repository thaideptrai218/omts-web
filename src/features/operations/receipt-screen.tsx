"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import * as c from "./contracts";
import { type Query } from "./repository";
import { loadOptions } from "./lookups";
import { ReceiptEditor } from "./receipt-editor";
import { ReceiptListFilters, type ReceiptListFilterValues } from "./receipt-list-filters";
import { ReceiptRaftCostsDialog } from "./receipt-raft-costs-dialog";
import { ReceiptTotals, loadZoneRafts, receiptAllowed, receiptRepository as repository } from "./receipt-shared";
import {
  DataTable,
  ErrorNotice,
  Money,
  OperationHeading,
  Paging,
  Skeleton,
  businessToday,
  statusLabel,
  useMutation,
  useRemote,
} from "./ui";

// The editor lives in its own module; keep exporting it from here for existing importers.
export { ReceiptEditor };

const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
const loadSuppliers = (signal: AbortSignal) => loadOptions("suppliers", signal);
const loadItems = (signal: AbortSignal) => loadOptions("input-items", signal);

/** Purchase receipt list with filters, raft material costs, Excel export and the receipt editor. */
export function ReceiptScreen() {
  const context = useApiWorkspace();
  const [filters, setFilters] = useState<ReceiptListFilterValues>({
    code: "",
    zoneId: "",
    supplierId: "",
    raftId: "",
    itemId: "",
    itemGroup: "",
    statusId: "",
    // Default period: from 1 January of the current business year until today.
    from: businessToday().slice(0, 4) + "-01-01",
    to: businessToday(),
  });
  const [page, setPage] = useState(1);
  // undefined = editor closed, null = creating a new receipt.
  const [selected, setSelected] = useState<c.Receipt | null>();
  const [costs, setCosts] = useState<z.infer<typeof c.raftCostsSchema>>();
  // Bumped to remount the editor with fresh state after open/save.
  const [editorSerial, setEditorSerial] = useState(0);
  // Invoice files chosen before the first save, handed to the remounted editor of the saved receipt.
  const [pendingInvoices, setPendingInvoices] = useState<{ receiptId: string; files: File[] }>();
  const [notice, setNotice] = useState<string>();
  const zones = useRemote(loadZones);
  const suppliers = useRemote(loadSuppliers);
  const items = useRemote(loadItems);
  const query = useMemo<Query>(() => ({ ...filters, page: String(page), pageSize: "20" }), [filters, page]);
  const list = useRemote(
    useMemo(() => (signal: AbortSignal) => repository.read("list", query, c.receiptSearchSchema, signal), [query]),
  );
  const rafts = useRemote(
    useMemo(() => (signal: AbortSignal) => loadZoneRafts(signal, filters.zoneId), [filters.zoneId]),
  );
  const mutation = useMutation();
  const canCreate = receiptAllowed(context, "Create");
  const canExport = receiptAllowed(context, "Export", filters.zoneId || undefined);
  const lookupError = zones.error || suppliers.error || items.error || rafts.error;

  // Any filter change returns to page 1; changing the zone also clears the raft filter.
  const filter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "zoneId" ? { raftId: "" } : {}) }));
    setPage(1);
  };

  async function open(id: string) {
    const result = await mutation.run(() => repository.read("detail", { id }, c.receiptSchema), true);
    if (result) {
      setPendingInvoices(undefined);
      setSelected(result);
      setEditorSerial((value) => value + 1);
    }
  }

  return (
    <section>
      <OperationHeading
        title="Phiếu nhập vật tư"
        description="Tra cứu vật tư đã nhận, tình trạng thanh toán và công nợ theo vùng."
        icon="document"
      >
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Button
              className="w-auto"
              disabled={mutation.pending}
              onClick={() => {
                setPendingInvoices(undefined);
                setSelected(null);
              }}
            >
              Tạo phiếu nhập
            </Button>
          )}
          <Button
            className="w-auto"
            variant="secondary"
            disabled={mutation.pending}
            onClick={async () => {
              const result = await mutation.run(() => repository.read("costs", query, c.raftCostsSchema), true);
              if (result) setCosts(result);
            }}
          >
            Chi phí vật tư bè
          </Button>
          {canExport && (
            <Button
              className="w-auto"
              variant="secondary"
              disabled={mutation.pending}
              onClick={() => void mutation.run(() => repository.download(query), true)}
            >
              Xuất Excel
            </Button>
          )}
        </div>
      </OperationHeading>
      <ReceiptListFilters
        filters={filters}
        filter={filter}
        zones={zones.data}
        suppliers={suppliers.data}
        items={items.data}
        rafts={rafts.data}
      />
      <ErrorNotice error={list.error || mutation.error || lookupError} />
      {lookupError && (
        <Button
          className="mt-3 w-auto"
          variant="secondary"
          disabled={mutation.pending || zones.loading || suppliers.loading || items.loading || rafts.loading}
          onClick={() => {
            // Reload only the lookups that failed.
            if (zones.error) zones.reload();
            if (suppliers.error) suppliers.reload();
            if (items.error) items.reload();
            if (rafts.error) rafts.reload();
          }}
        >
          Tải lại danh mục phiếu nhập
        </Button>
      )}
      <Button className="mt-4 w-auto" variant="secondary" disabled={list.loading} onClick={list.reload}>
        Tải lại danh sách
      </Button>
      {notice && (
        <p role="status" className="mt-3 text-primary">
          {notice}
        </p>
      )}
      {list.loading ? (
        <Skeleton />
      ) : (
        list.data && (
          <>
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-4">
              <h2 className="text-base font-semibold tracking-tight">Danh sách phiếu</h2>
              <p className="text-xs text-text-muted">
                {list.data.page.total} phiếu trong kỳ · {list.data.from} — {list.data.to}
              </p>
            </div>
            <ReceiptTotals record={list.data.totals} />
            <p className="-mt-2 text-xs text-text-muted">
              Tổng hợp từ {list.data.totals.completedCount} phiếu đã hoàn thành trong khoảng thời gian đã chọn.
            </p>
            <DataTable
              headings={[
                "Mã phiếu",
                "Ngày nhập",
                "Nhà cung cấp",
                "Vùng / bè",
                "Trạng thái",
                "Phải trả",
                "Còn nợ",
                "Chi tiết",
              ]}
              empty={!list.data.page.items.length}
            >
              {list.data.page.items.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.receiptDate ?? "—"}</td>
                  <td>{row.supplier.name}</td>
                  <td>
                    {row.zone.name}
                    {row.raft ? ` / ${row.raft.code}` : ""}
                  </td>
                  <td>{statusLabel(row.statusId)}</td>
                  <td>
                    <Money value={row.payable} />
                  </td>
                  <td>
                    <Money value={row.outstanding} />
                  </td>
                  <td>
                    <button
                      className="font-semibold text-primary underline"
                      disabled={mutation.pending}
                      onClick={() => void open(row.id)}
                    >
                      Mở phiếu
                    </button>
                  </td>
                </tr>
              ))}
            </DataTable>
            <Paging page={page} total={list.data.page.total} disabled={list.loading} onChange={setPage} />
          </>
        )
      )}
      {selected !== undefined && (
        <ReceiptEditor
          key={`${selected?.id ?? "new"}:${editorSerial}`}
          record={selected}
          zones={zones.data ?? []}
          suppliers={suppliers.data ?? []}
          items={items.data ?? []}
          initialFiles={pendingInvoices?.receiptId === selected?.id ? pendingInvoices?.files : undefined}
          onClose={() => {
            setPendingInvoices(undefined);
            setSelected(undefined);
          }}
          onSaved={(saved, files = []) => {
            setPendingInvoices(files.length ? { receiptId: saved.id, files } : undefined);
            setSelected(saved);
            setEditorSerial((value) => value + 1);
            list.reload();
            setNotice(`Đã cập nhật phiếu ${saved.code}.`);
          }}
        />
      )}
      {costs && (
        <ReceiptRaftCostsDialog
          costs={costs}
          onClose={() => setCosts(undefined)}
          onOpenReceipt={(receiptId) => void open(receiptId)}
        />
      )}
    </section>
  );
}

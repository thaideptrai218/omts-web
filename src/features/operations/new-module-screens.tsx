"use client";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useMemo, useState } from "react";
import { z } from "zod";
import { FilterChecks } from "@/components/ui/filter-checks";
import { readSelectionPages } from "./selection-pages";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { DataGrid } from "@/components/ui/data-grid";
import styles from "@/features/sales-api/sales-workspace.module.css";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, FilterPanel, OperationHeading, Paging, Select, Skeleton, useMutation, useRemote } from "./ui";
import { TraderPurchasesScreen } from "@/features/trader-purchases/trader-purchases-screen";
import { TraderRequestDetailPage } from "@/features/trader-purchases/trader-request-detail-page";
import { ProductEditor } from "./sales-editors";
import { PurchaseRequestReviewDetails } from "./purchase-request-review-details";
import { ReviewStatusPill } from "./purchase-request-review-parts";
import { REVIEW_STATUS_OPTIONS, quantityWithCages, reviewResponseSummary } from "./purchase-request-review-presentation";
import { formatDate } from "@/features/trader-purchases/presentation";
import { useKgPerCage } from "@/features/harvest-settings-lookup/use-kg-per-cage";

const products = createOperationsRepository("sales-products"), requests = createOperationsRepository("purchase-requests");

export function SalesProductsScreen() {
  const { identity } = useApiWorkspace();
  const [all, setAll] = useState(false), [search, setSearch] = useState("");
  const [selected, setSelected] = useState<z.infer<typeof c.salesProductSchema> | null>();
  const loader = useMemo(() => (signal: AbortSignal) => products.read(all && identity.subjectType === "CooperativeOwner" ? "all" : "list", {}, z.array(c.salesProductSchema), signal), [all, identity.subjectType]);
  const catalog = useRemote(loader);
  const rows = catalog.data?.filter((row) => `${row.code} ${row.name}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <section><OperationHeading title="Danh mục sản phẩm hàu" description="Quản lý sản phẩm và tình trạng tiếp nhận yêu cầu mua." icon="document">{identity.subjectType === "CooperativeOwner" && <Button className="w-auto" onClick={() => setSelected(null)}>Thêm sản phẩm</Button>}</OperationHeading>
    <FilterPanel columns="two"><Field label="Tìm sản phẩm" value={search} onChange={(e) => setSearch(e.target.value)} />
      {identity.subjectType === "CooperativeOwner" && <Select label="Phạm vi sản phẩm" value={all ? "all" : "available"} onChange={(e) => setAll(e.target.value === "all")}><option value="available">Đang nhận yêu cầu mua</option><option value="all">Tất cả sản phẩm</option></Select>}</FilterPanel>
    <Button className="mt-4 w-auto" variant="secondary" disabled={catalog.loading} onClick={catalog.reload}>Tải lại sản phẩm</Button><ErrorNotice error={catalog.error} />
    {catalog.loading ? <Skeleton /> : rows && <DataTable headings={["Mã", "Sản phẩm", "Mô tả", "Trạng thái", "Nhận yêu cầu mua", ...(identity.subjectType === "CooperativeOwner" ? ["Chỉnh sửa"] : [])]} empty={!rows.length}>{rows.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td className="whitespace-pre-wrap">{row.description || "—"}</td><td>{row.inUse ? "Đang dùng" : "Ngừng dùng"}</td><td>{row.availableForPurchase ? "Có" : "Không"}</td>{identity.subjectType === "CooperativeOwner" && <td><button className="text-primary underline" onClick={() => setSelected(row)}>Chỉnh sửa</button></td>}</tr>)}</DataTable>}
    {selected !== undefined && <ProductEditor key={selected?.id ?? "new"} record={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); catalog.reload(); }} />}
  </section>;
}

/** Thương lái có màn riêng "Đơn mua của tôi" (GET /api/me/purchases, đơn vị kg); Chủ HTX/nhân viên xem danh sách duyệt ở dưới. */
export function PurchaseRequestsScreen() {
  const { identity } = useApiWorkspace();
  return identity.subjectType === "Trader" ? <TraderPurchasesScreen /> : <PurchaseRequestsReviewScreen />;
}

function PurchaseRequestsReviewScreen() {
  const { identity } = useApiWorkspace();
  const [status, setStatus] = useState(""), [page, setPage] = useState(1), [selected, setSelected] = useState<c.PurchaseRequest>();
  const query = useMemo(() => ({ page: String(page), pageSize: "20" }), [page]);
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => readSelectionPages((params, signal) => requests.read("list", params, c.purchaseRequestPageSchema, signal), query, { status }, signal, (a, b) => b.sentAt.localeCompare(a.sentAt)), [query, status]));
  const mutation = useMutation();
  const { kgPerCage } = useKgPerCage(identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined); // Chỉ Chủ HTX đọc được.
  async function open(id: string) { const found = await mutation.run(() => requests.read("detail", { id }, c.purchaseRequestSchema), true); if (found) setSelected(found); }
  return <section><OperationHeading title="Yêu cầu mua hàu" description="Theo dõi số lượng, ngày lấy hàng và phản hồi theo từng yêu cầu của thương lái. Yêu cầu tính theo kg; số lồng có dấu “≈” là quy đổi gần đúng." icon="document" />
    <FilterWorkspace label="Lọc yêu cầu mua" reset={<button type="button" className={styles.reset} disabled={!status} onClick={() => { setStatus(""); setPage(1); }}>Đặt lại</button>} filters={<FilterChecks label="Trạng thái yêu cầu" value={status} options={REVIEW_STATUS_OPTIONS} onChange={value => { setStatus(value); setPage(1); }} />}>
      <div className={styles.results}><div className={styles.toolbar}><div><h2>{status === "-" ? "Chưa chọn trạng thái" : status ? "Yêu cầu theo trạng thái đã chọn" : "Tất cả yêu cầu mua"}</h2><p>{rows.loading ? "Đang tải…" : rows.data ? `${rows.data.total} yêu cầu · ${rows.data.pageSize} dòng/trang` : "Chưa tải được dữ liệu"}</p></div><Button className="w-auto" variant="secondary" disabled={rows.loading || mutation.pending} onClick={rows.reload}>Tải lại yêu cầu mua</Button></div><ErrorNotice error={rows.error || mutation.error} />
      {rows.loading ? <Skeleton /> : rows.data && <><DataGrid responsive headings={["Thương lái", "Sản phẩm", "Số lượng yêu cầu", "Ngày lấy hàng", "Trạng thái", "Phản hồi của HTX", "Chi tiết"]} empty={!rows.data.items.length}>{rows.data.items.map((row) => { const response = reviewResponseSummary(row, kgPerCage); return <OpenableTableRow key={row.id} disabled={mutation.pending} onOpen={() => void open(row.id)}>
        <td data-label="Thương lái"><span className={styles.code}>{row.customer.name}</span><small className={styles.meta}>{row.customer.phoneNumber || "Chưa có số điện thoại"}</small></td><td data-label="Sản phẩm" className={styles.name}>{row.productName}</td><td data-label="Số lượng yêu cầu" className={styles.number}>{quantityWithCages(row.requestedKg, kgPerCage)}</td><td data-label="Ngày lấy hàng" className={styles.date}>{formatDate(row.pickupDate)}</td><td data-label="Trạng thái"><ReviewStatusPill request={row} /></td>
        <td data-label="Phản hồi của HTX" className={styles.response}><strong>{response.headline}</strong>{response.note && <span>{response.note}</span>}</td>
        <td data-label="Chi tiết"><button className={styles.open} disabled={mutation.pending} onClick={() => void open(row.id)}>Mở yêu cầu</button></td></OpenableTableRow>; })}</DataGrid><div className={styles.requestPaging}><Paging page={rows.data.page} pageSize={rows.data.pageSize} total={rows.data.total} disabled={mutation.pending || rows.loading} onChange={setPage} /></div></>}
      </div>
    </FilterWorkspace>
    {selected && <PurchaseRequestReviewDetails key={`${selected.id}:${selected.rowVersion}`} record={selected} kgPerCage={kgPerCage} onClose={() => setSelected(undefined)} onSaved={(saved) => { setSelected(saved); rows.reload(); }} />}
  </section>;
}

export function PurchaseRequestDetailPage({ id }: { id: string }) {
  const { identity } = useApiWorkspace();
  return identity.subjectType === "Trader" ? <TraderRequestDetailPage id={id} /> : <PurchaseRequestReviewDetail id={id} />;
}

function PurchaseRequestReviewDetail({ id }: { id: string }) {
  const { identity } = useApiWorkspace();
  const loaded = useRemote(useMemo(() => (signal: AbortSignal) => requests.read("detail", { id }, c.purchaseRequestSchema, signal), [id]));
  const [record, setRecord] = useState<c.PurchaseRequest>();
  const { kgPerCage } = useKgPerCage(identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined);
  const current = record ?? loaded.data;
  if (loaded.loading) return <Skeleton />;
  if (loaded.error) return <ErrorNotice error={loaded.error} />;
  if (!current) return <p role="alert" className="rounded-card border border-border p-5">Không tìm thấy yêu cầu mua.</p>;
  return <PurchaseRequestReviewDetails record={current} kgPerCage={kgPerCage} onClose={() => window.history.back()} onSaved={(saved) => setRecord(saved)} />;
}

export { WorkforceScreen } from "./workforce-screen";

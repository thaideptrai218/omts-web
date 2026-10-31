"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Paging, Select, Skeleton, useMutation, useRemote } from "./ui";
import { CreatePurchaseRequest, ProductEditor, PurchaseRequestDetails, requestStatusLabel } from "./sales-editors";

const products = createOperationsRepository("sales-products"), requests = createOperationsRepository("purchase-requests");

export function SalesProductsScreen() {
  const { identity } = useApiWorkspace();
  const [all, setAll] = useState(false), [search, setSearch] = useState("");
  const [selected, setSelected] = useState<z.infer<typeof c.salesProductSchema> | null>();
  const loader = useMemo(() => (signal: AbortSignal) => products.read(all && identity.subjectType === "CooperativeOwner" ? "all" : "list", {}, z.array(c.salesProductSchema), signal), [all, identity.subjectType]);
  const catalog = useRemote(loader);
  const rows = catalog.data?.filter((row) => `${row.code} ${row.name}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <section><h1 className="text-3xl font-semibold">Sản phẩm bán</h1>{identity.subjectType === "CooperativeOwner" && <Button className="mt-4 w-auto" onClick={() => setSelected(null)}>Thêm sản phẩm bán</Button>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Tìm sản phẩm" value={search} onChange={(e) => setSearch(e.target.value)} />
      {identity.subjectType === "CooperativeOwner" && <Select label="Phạm vi sản phẩm" value={all ? "all" : "available"} onChange={(e) => setAll(e.target.value === "all")}><option value="available">Đang nhận yêu cầu mua</option><option value="all">Tất cả sản phẩm</option></Select>}</div>
    <Button className="mt-4 w-auto" variant="secondary" disabled={catalog.loading} onClick={catalog.reload}>Tải lại sản phẩm</Button><ErrorNotice error={catalog.error} />
    {catalog.loading ? <Skeleton /> : rows && <DataTable headings={["Mã", "Sản phẩm", "Mô tả", "Trạng thái", "Nhận yêu cầu mua", ...(identity.subjectType === "CooperativeOwner" ? ["Chỉnh sửa"] : [])]} empty={!rows.length}>{rows.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td className="whitespace-pre-wrap">{row.description || "—"}</td><td>{row.inUse ? "Đang dùng" : "Ngừng dùng"}</td><td>{row.availableForPurchase ? "Có" : "Không"}</td>{identity.subjectType === "CooperativeOwner" && <td><button className="text-primary underline" onClick={() => setSelected(row)}>Chỉnh sửa</button></td>}</tr>)}</DataTable>}
    {selected !== undefined && <ProductEditor key={selected?.id ?? "new"} record={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); catalog.reload(); }} />}
  </section>;
}

export function PurchaseRequestsScreen() {
  const { identity } = useApiWorkspace(), mine = identity.subjectType === "Trader";
  const [status, setStatus] = useState(""), [page, setPage] = useState(1), [selected, setSelected] = useState<c.PurchaseRequest>();
  const [creating, setCreating] = useState(false);
  const query = useMemo(() => ({ status, page: String(page), pageSize: "20" }), [status, page]);
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => requests.read(mine ? "mine" : "list", query, c.purchaseRequestPageSchema, signal), [mine, query]));
  const mutation = useMutation();
  async function open(id: string) { const found = await mutation.run(() => requests.read(mine ? "mine-detail" : "detail", { id }, c.purchaseRequestSchema), true); if (found) setSelected(found); }
  return <section><h1 className="text-3xl font-semibold">{mine ? "Yêu cầu mua của tôi" : "Yêu cầu mua hàng"}</h1>
    {mine && <Button className="mt-4 w-auto" onClick={() => setCreating(true)}>Gửi yêu cầu mua</Button>}
    <div className="mt-5 max-w-md"><Select label="Trạng thái yêu cầu" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{c.requestStatusSchema.options.map((value) => <option key={value} value={value}>{requestStatusLabel(value)}</option>)}</Select></div>
    <Button className="mt-4 w-auto" variant="secondary" disabled={rows.loading || mutation.pending} onClick={rows.reload}>Tải lại yêu cầu mua</Button><ErrorNotice error={rows.error || mutation.error} />
    {rows.loading ? <Skeleton /> : rows.data && <><DataTable headings={["Mã", "Thương lái", "Sản phẩm", "Số lồng yêu cầu", "Ngày nhận dự kiến", "Trạng thái", "Chi tiết"]} empty={!rows.data.items.length}>{rows.data.items.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.customerName}</td><td>{row.productName}</td><td>{row.requestedCages}</td><td>{row.requestedPickupDate}</td><td>{requestStatusLabel(row.status)}</td><td><button className="text-primary underline" disabled={mutation.pending} onClick={() => void open(row.id)}>Mở yêu cầu</button></td></tr>)}</DataTable><Paging page={page} total={rows.data.total} disabled={mutation.pending} onChange={setPage} /></>}
    {creating && <CreatePurchaseRequest onClose={() => setCreating(false)} onSaved={() => { setCreating(false); rows.reload(); }} />}
    {selected && <PurchaseRequestDetails key={`${selected.id}:${selected.rowVersion}`} record={selected} onClose={() => setSelected(undefined)} onSaved={(saved) => { setSelected(saved); rows.reload(); }} />}
  </section>;
}

export { WorkforceScreen } from "./workforce-screen";

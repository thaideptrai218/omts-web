"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Paging, Select, Skeleton, businessToday, displayTime, useMutation, useRemote } from "./ui";

const products = createOperationsRepository("sales-products"), requests = createOperationsRepository("purchase-requests"), workforce = createOperationsRepository("workforce");
export const requestStatusLabel = (status: string) => ({ AWAITING_RESPONSE: "Chờ phản hồi", ACCEPTED: "Đã chấp nhận", DECLINED: "Đã từ chối", CANCELLED: "Đã hủy" }[status] ?? status);

export function SalesProductsScreen() {
  const { identity } = useApiWorkspace();
  const [all, setAll] = useState(false), [search, setSearch] = useState("");
  const loader = useMemo(() => (signal: AbortSignal) => products.read(all && identity.subjectType === "CooperativeOwner" ? "all" : "list", {}, z.array(c.salesProductSchema), signal), [all, identity.subjectType]);
  const catalog = useRemote(loader);
  const rows = catalog.data?.filter((row) => `${row.code} ${row.name}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <section><h1 className="text-3xl font-semibold">Sản phẩm bán</h1>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Tìm sản phẩm" value={search} onChange={(e) => setSearch(e.target.value)} />
      {identity.subjectType === "CooperativeOwner" && <Select label="Phạm vi sản phẩm" value={all ? "all" : "available"} onChange={(e) => setAll(e.target.value === "all")}><option value="available">Đang nhận yêu cầu mua</option><option value="all">Tất cả sản phẩm</option></Select>}</div>
    <Button className="mt-4 w-auto" variant="secondary" disabled={catalog.loading} onClick={catalog.reload}>Tải lại sản phẩm</Button><ErrorNotice error={catalog.error} />
    {catalog.loading ? <Skeleton /> : rows && <DataTable headings={["Mã", "Sản phẩm", "Mô tả", "Trạng thái", "Nhận yêu cầu mua"]} empty={!rows.length}>{rows.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td className="whitespace-pre-wrap">{row.description || "—"}</td><td>{row.inUse ? "Đang dùng" : "Ngừng dùng"}</td><td>{row.availableForPurchase ? "Có" : "Không"}</td></tr>)}</DataTable>}
  </section>;
}

export function PurchaseRequestsScreen() {
  const { identity } = useApiWorkspace(), mine = identity.subjectType === "Trader";
  const [status, setStatus] = useState(""), [page, setPage] = useState(1), [selected, setSelected] = useState<c.PurchaseRequest>();
  const query = useMemo(() => ({ status, page: String(page), pageSize: "20" }), [status, page]);
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => requests.read(mine ? "mine" : "list", query, c.purchaseRequestPageSchema, signal), [mine, query]));
  const mutation = useMutation();
  async function open(id: string) { const found = await mutation.run(() => requests.read(mine ? "mine-detail" : "detail", { id }, c.purchaseRequestSchema), true); if (found) setSelected(found); }
  return <section><h1 className="text-3xl font-semibold">{mine ? "Yêu cầu mua của tôi" : "Yêu cầu mua hàng"}</h1>
    <div className="mt-5 max-w-md"><Select label="Trạng thái yêu cầu" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{c.requestStatusSchema.options.map((value) => <option key={value} value={value}>{requestStatusLabel(value)}</option>)}</Select></div>
    <Button className="mt-4 w-auto" variant="secondary" disabled={rows.loading || mutation.pending} onClick={rows.reload}>Tải lại yêu cầu mua</Button><ErrorNotice error={rows.error || mutation.error} />
    {rows.loading ? <Skeleton /> : rows.data && <><DataTable headings={["Mã", "Thương lái", "Sản phẩm", "Số lồng yêu cầu", "Ngày nhận dự kiến", "Trạng thái", "Chi tiết"]} empty={!rows.data.items.length}>{rows.data.items.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.customerName}</td><td>{row.productName}</td><td>{row.requestedCages}</td><td>{row.requestedPickupDate}</td><td>{requestStatusLabel(row.status)}</td><td><button className="text-primary underline" disabled={mutation.pending} onClick={() => void open(row.id)}>Mở yêu cầu</button></td></tr>)}</DataTable><Paging page={page} total={rows.data.total} disabled={mutation.pending} onChange={setPage} /></>}
    {selected && <Dialog open title={`Yêu cầu ${selected.code}`} size="lg" onOpenChange={(open) => { if (!open) setSelected(undefined); }}>
      <dl className="grid gap-4 sm:grid-cols-2">{[["Thương lái", selected.customerName], ["Sản phẩm", selected.productName], ["Trạng thái", requestStatusLabel(selected.status)], ["Tạo lúc", displayTime(selected.createdAt)],
        ["Số lồng yêu cầu", selected.requestedCages], ["Ngày nhận dự kiến", selected.requestedPickupDate], ["Ghi chú", selected.note], ["Số lồng chấp nhận", selected.acceptedCages], ["Ngày nhận đã chấp nhận", selected.acceptedPickupDate],
        ["Cho trả sau", selected.status === "ACCEPTED" ? selected.allowPayLater ? "Có" : "Không" : "—"], ["Phản hồi của HTX", selected.responseNote], ["Phản hồi lúc", selected.respondedAt && displayTime(selected.respondedAt)],
        ["Hủy lúc", selected.cancelledAt && displayTime(selected.cancelledAt)], ["Lý do hủy", selected.cancellationReason]].map(([label, value]) => <div key={String(label)}><dt className="text-sm text-text-muted">{label}</dt><dd className="whitespace-pre-wrap break-words">{value ?? "—"}</dd></div>)}</dl>
      <Button className="mt-5" variant="secondary" onClick={() => setSelected(undefined)}>Đóng</Button>
    </Dialog>}
  </section>;
}

export function WorkforceScreen() {
  const [day, setDay] = useState(businessToday);
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => day ? workforce.read("list", { day }, z.array(c.assignmentSchema), signal)
    : Promise.resolve({ status: "success" as const, data: [] }), [day]));
  return <section><h1 className="text-3xl font-semibold">Phân công và chấm công</h1><div className="mt-5 grid gap-4 sm:grid-cols-2">
    <Field label="Ngày làm việc" type="date" required value={day} onChange={(e) => setDay(e.target.value)} /></div>
    <Button className="mt-4 w-auto" variant="secondary" disabled={rows.loading || !day} onClick={rows.reload}>Tải lại phân công</Button><ErrorNotice error={rows.error} />
    {rows.loading ? <Skeleton /> : rows.data && <DataTable headings={["Nhân viên", "Bè", "Công việc", "Ngày", "Vào làm", "Ra về"]} empty={!rows.data.length}>{rows.data.map((row) => <tr key={row.id}><td>{row.employeeName}</td><td>{row.raftCode || "—"}</td><td>{row.job}</td><td>{row.date}</td><td>{row.checkedInAt ? displayTime(row.checkedInAt) : "Chưa ghi nhận"}</td><td>{row.checkedOutAt ? displayTime(row.checkedOutAt) : "Chưa ghi nhận"}</td></tr>)}</DataTable>}
  </section>;
}

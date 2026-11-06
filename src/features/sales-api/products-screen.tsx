"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ManagementHeading, StatusPill } from "@/components/ui/management-page";
import { createOperationsRepository } from "@/features/operations/repository";
import { DataTable, Field, Select, ErrorNotice, Skeleton, Money, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { product, saveProduct, type Product } from "./contracts";
const repository = createOperationsRepository("sales-products");
export function ProductsScreen() {
  const { identity } = useApiWorkspace(), owner = identity.subjectType === "CooperativeOwner", trader = identity.subjectType === "Trader";
  const [search, setSearch] = useState(""), [statusId, setStatus] = useState(""), [selected, setSelected] = useState<Product | null>();
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("list", owner && statusId ? { statusId } : {}, z.array(product), signal), [owner, statusId]));
  const rows = remote.data?.filter(p => p.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <section><ManagementHeading title="Danh mục sản phẩm hàu" description={trader ? "Các sản phẩm hợp tác xã đang cung cấp." : "Quản lý tên sản phẩm, đơn giá bán theo kg và tình trạng sử dụng."} icon="product">{owner && <Button className="w-auto" onClick={() => setSelected(null)}>Thêm sản phẩm</Button>}</ManagementHeading><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Tìm sản phẩm" type="search" value={search} onChange={e => setSearch(e.target.value)} />{owner && <Select label="Trạng thái" value={statusId} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option><option value="101">Đang dùng</option><option value="102">Ngừng dùng</option></Select>}</div><ErrorNotice error={remote.error} /><Button className="mt-4 w-auto" variant="secondary" disabled={remote.loading} onClick={remote.reload}>Tải lại danh mục</Button>{remote.loading ? <Skeleton /> : <DataTable headings={["Sản phẩm", ...(!trader ? ["Đơn giá/kg"] : []), "Trạng thái", "Hồ sơ"]} empty={!rows?.length}>{rows?.map(row => <tr key={row.id}><td>{row.name}</td>{!trader && <td><Money value={row.unitPrice} /></td>}<td><StatusPill tone={row.statusId === 101 ? "success" : "neutral"}>{row.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}</StatusPill></td><td><button className="text-primary underline" onClick={() => setSelected(row)}>Mở sản phẩm</button></td></tr>)}</DataTable>}{selected !== undefined && <ProductForm key={selected?.rowVersion ?? "new"} record={selected} owner={owner} trader={trader} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); remote.reload(); }} />}</section>;
}
function ProductForm({ record, owner, trader, onClose, onSaved }: { record: Product | null; owner: boolean; trader: boolean; onClose(): void; onSaved(): void }) {
  const [name, setName] = useState(record?.name ?? ""), [price, setPrice] = useState(String(record?.unitPrice ?? "")), [error, setError] = useState<string>();
  const [latest, setLatest] = useState<Product>();
  const dirty = name !== (record?.name ?? "") || price !== String(record?.unitPrice ?? "");
  const editor = useOperationEditor(onClose, dirty), read = useMutation();
  const editable = owner && (!record || record.statusId === 101);
  async function save() {
    const payload = saveProduct.safeParse({ name, unitPrice: Number(price), rowVersion: record?.rowVersion ?? null });
    if (!payload.success) { setError("Nhập tên sản phẩm và đơn giá nguyên dương theo kg."); return; }
    setError(undefined);
    if (await editor.submit(`Lưu sản phẩm ${name}, đơn giá ${Number(price).toLocaleString("vi-VN")} đồng/kg?`, () => repository.write(record ? "update" : "create", payload.data, product, record?.id))) onSaved();
  }
  return <Dialog open title={record ? `Sản phẩm ${record.name}` : "Thêm sản phẩm hàu"} dismissible={!editor.pending} onOpenChange={open => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error || read.error} />{record?.statusId === 102 && owner && <p className="mb-4 text-sm">Khôi phục sử dụng trước khi sửa sản phẩm.</p>}<form onSubmit={e => { e.preventDefault(); if (editable) void save(); }}><fieldset disabled={!editable || editor.disabled} className="space-y-4"><Field label="Tên sản phẩm *" required maxLength={200} value={name} onChange={e => setName(e.target.value)} />{!trader && <Field label="Đơn giá (đồng/kg) *" required type="number" min={1} step={1} value={price} onChange={e => setPrice(e.target.value)} />}{editable && <Button type="submit" disabled={!!record && !dirty}>Lưu sản phẩm</Button>}</fieldset></form>{owner && record && <Button className="mt-4" variant="secondary" disabled={dirty || editor.disabled} onClick={async () => { const resume = record.statusId === 102; if (await editor.submit(`${resume ? "Khôi phục" : "Ngừng dùng"} sản phẩm ${record.name}?`, () => repository.write(resume ? "resume" : "discontinue", {}, product, record.id))) onSaved(); }}>{record.statusId === 102 ? "Khôi phục sử dụng" : "Ngừng sử dụng"}</Button>}{editor.mutation.blocked && record && <div className="mt-4"><p className="text-sm">Giữ nguyên bản nháp; đối chiếu dữ liệu trước khi lưu tiếp.</p><Button className="mt-2" variant="secondary" disabled={read.pending} onClick={async () => { const value = await read.run(() => repository.read("detail", { id: record.id }, product), true); if (value) setLatest(value); }}>Đọc sản phẩm hiện tại</Button>{latest && <p className="mt-3">{latest.name} · {latest.unitPrice?.toLocaleString("vi-VN")} đồng/kg · {latest.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}</p>}</div>}<Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button></Dialog>;
}

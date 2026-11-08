"use client";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Button } from "@/components/ui/button";
import { FilterChecks } from "@/components/ui/filter-checks";
import { matchesSelection } from "@/shared/presentation/filter-selection";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { DataGrid } from "@/components/ui/data-grid";
import styles from "./sales-workspace.module.css";
import { Dialog } from "@/components/ui/dialog";
import { ManagementHeading, StatusPill } from "@/components/ui/management-page";
import { createOperationsRepository } from "@/features/operations/repository";
import { Field, Select, ErrorNotice, Skeleton, Money, Paging, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { product, saveProduct, type Product } from "./contracts";
const repository = createOperationsRepository("sales-products");
export function ProductsScreen() {
  const { identity } = useApiWorkspace(), owner = identity.subjectType === "CooperativeOwner", trader = identity.subjectType === "Trader";
  const [search, setSearch] = useState(""), [statusId, setStatus] = useState(""), [selected, setSelected] = useState<Product | null>();
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("list", {}, z.array(product), signal), []));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const rows = remote.data?.filter(p => p.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) && (!owner || matchesSelection(statusId,String(p.statusId))));
  const currentPage = Math.min(page, Math.max(1, Math.ceil((rows?.length ?? 0) / pageSize)));
  return <section><ManagementHeading title="Danh mục sản phẩm hàu" description={trader ? "Các sản phẩm hợp tác xã đang cung cấp." : "Quản lý tên sản phẩm, đơn giá bán theo kg và tình trạng sử dụng."} icon="product">{owner && <Button className="w-auto" onClick={() => setSelected(null)}>Thêm sản phẩm</Button>}</ManagementHeading>
    <FilterWorkspace label="Lọc sản phẩm" reset={<button type="button" className={styles.reset} disabled={!search && !statusId} onClick={() => { setSearch(""); setStatus(""); setPage(1); }}>Đặt lại</button>} filters={<>{owner && <FilterChecks label="Trạng thái" value={statusId} options={[["101","Đang dùng"],["102","Ngừng dùng"]]} onChange={value=>{setStatus(value);setPage(1);}} />}</>}>

      <div className={styles.results}><div className="mb-5 max-w-xl"><Field label="Tìm sản phẩm" type="search" placeholder="Nhập tên sản phẩm…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div><div className={styles.toolbar}><div><h2>Sản phẩm của hợp tác xã</h2><p>{remote.loading ? "Đang tải…" : rows ? `${rows.length} sản phẩm phù hợp` : "Chưa tải được dữ liệu"}</p></div><Button className="w-auto" variant="secondary" disabled={remote.loading} onClick={remote.reload}>Tải lại danh mục</Button></div><ErrorNotice error={remote.error} />
      {remote.loading ? <Skeleton /> : rows && <><DataGrid responsive headings={["Sản phẩm", ...(!trader ? ["Đơn giá/kg"] : []), "Trạng thái", "Hồ sơ"]} empty={!rows.length}>{rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(row => <OpenableTableRow key={row.id} onOpen={()=>setSelected(row)}><td data-label="Sản phẩm" className={styles.name}>{row.name}</td>{!trader && <td data-label="Đơn giá/kg" className={styles.number}><Money value={row.unitPrice} /></td>}<td data-label="Trạng thái"><StatusPill tone={row.statusId === 101 ? "success" : "neutral"}>{row.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}</StatusPill></td><td data-label="Hồ sơ"><button className={styles.open} aria-label={`Mở sản phẩm ${row.name}`} onClick={() => setSelected(row)}>Mở sản phẩm</button></td></OpenableTableRow>)}</DataGrid><div className={styles.paging}><Select label="Số dòng/trang" value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}</Select><Paging page={currentPage} total={rows.length} pageSize={pageSize} onChange={setPage} /></div></>}
      </div>
    </FilterWorkspace>{selected !== undefined && <ProductForm key={selected?.rowVersion ?? "new"} record={selected} owner={owner} trader={trader} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); remote.reload(); }} />}</section>;
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

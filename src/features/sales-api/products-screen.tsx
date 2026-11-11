"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { DataGrid } from "@/components/ui/data-grid";
import styles from "./sales-workspace.module.css";
import { ManagementHeading, StatusPill } from "@/components/ui/management-page";
import { createOperationsRepository } from "@/features/operations/repository";
import { Field, Select, ErrorNotice, Skeleton, Money, Paging, useRemote } from "@/features/operations/ui";
import { product } from "./contracts";
const repository = createOperationsRepository("sales-products");

/**
 * The plain product list a trader reads (names and, when the cooperative shows it, the price per kg). The catalogue with its stock,
 * movements and editing is `/sales/products` for everyone else.
 */
export function ProductsScreen() {
  const { identity } = useApiWorkspace(), trader = identity.subjectType === "Trader";
  const [search, setSearch] = useState("");
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("list", {}, z.array(product), signal), []));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const rows = remote.data?.filter(p => p.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  const currentPage = Math.min(page, Math.max(1, Math.ceil((rows?.length ?? 0) / pageSize)));
  return <section><ManagementHeading title="Danh mục sản phẩm hàu" description="Các sản phẩm hợp tác xã đang cung cấp." icon="product" />
    <div className={styles.results}><div className="mb-5 max-w-xl"><Field label="Tìm sản phẩm" type="search" placeholder="Nhập tên sản phẩm…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div><div className={styles.toolbar}><div><h2>Sản phẩm của hợp tác xã</h2><p>{remote.loading ? "Đang tải…" : rows ? `${rows.length} sản phẩm phù hợp` : "Chưa tải được dữ liệu"}</p></div></div><ErrorNotice error={remote.error} />
      {remote.loading ? <Skeleton /> : rows && <><DataGrid responsive headings={["Sản phẩm", ...(!trader ? ["Đơn giá/kg"] : []), "Trạng thái"]} empty={!rows.length}>{rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(row => <tr key={row.id}><td data-label="Sản phẩm" className={styles.name}>{row.name}</td>{!trader && <td data-label="Đơn giá/kg" className={styles.number}><Money value={row.unitPrice} /></td>}<td data-label="Trạng thái"><StatusPill tone={row.statusId === 101 ? "success" : "neutral"}>{row.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}</StatusPill></td></tr>)}</DataGrid><div className={styles.paging}><Select label="Số dòng/trang" value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}</Select><Paging page={currentPage} total={rows.length} pageSize={pageSize} onChange={setPage} /></div></>}
      </div>
    </section>;
}

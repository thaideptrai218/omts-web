"use client";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Select, Skeleton } from "@/features/operations/ui";
import type { ProductOption } from "./product-options";

/**
 * "Loại hàu nuôi (sản phẩm bán)": the catalogue product a cycle farms and later sells (Hàu múp, Hàu gầy 3cm…). Required to start a cycle;
 * purchase requests must match it when a harvest is recorded. Has its own loading, error and empty states.
 */
export function CycleProductSelect({ products, loading, error, onReload, value, onChange, message }: { products?: readonly ProductOption[]; loading: boolean; error?: string; onReload(): void; value: string; onChange(id: string): void; message?: string }) {
  if (loading) return <Skeleton />;
  if (error) return <><ErrorNotice error={error} /><Button key="reload-products" type="button" variant="secondary" className="w-auto" onClick={onReload}>Tải lại loại hàu</Button></>;
  if (!products?.length) return <p role="status" className="rounded-control border border-border p-3 text-sm">Danh mục chưa có sản phẩm nào đang dùng. Hãy thêm loại hàu (ví dụ Hàu múp) trong danh mục sản phẩm trước khi bắt đầu chu kỳ.</p>;
  return <div><Select label="Loại hàu nuôi (sản phẩm bán) *" required value={value} aria-invalid={!!message} onChange={event => onChange(event.target.value)}>
    <option value="">Chọn loại hàu nuôi</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</Select>
    <p className="mt-1 text-xs text-text-muted">Đơn mua của khách phải khớp loại hàu này mới ghi nhận được thu hoạch.</p>
    {message && <p role="alert" className="mt-1 text-xs text-danger">{message}</p>}</div>;
}

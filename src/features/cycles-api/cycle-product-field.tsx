"use client";
import { Select } from "@/features/operations/ui";
import { useHarvestProducts } from "@/features/cultivation-api/harvest-product-lines";
import type { z } from "zod";
import type { cycleProduct } from "./contracts";

/**
 * "Sản phẩm nuôi": the product farmed on the raft in the cycle, chosen among the products In Use; the product the cycle already has stays in the list
 * even when it has been discontinued since, so the cycle can still be edited.
 */
export function CycleProductField({ value, current, label = "Sản phẩm nuôi", error, disabled, onChange }: {
  value: string; current?: z.infer<typeof cycleProduct> | null; label?: string; error?: string; disabled?: boolean; onChange(productId: string): void;
}) {
  const { products, loading, error: loadError, reload } = useHarvestProducts(current ? [{ productId: current.id, productCode: current.code, productName: current.name }] : []);
  return <div>
    <Select label={label} disabled={disabled || loading} value={value} aria-invalid={!!error} onChange={event => onChange(event.target.value)}>
      <option value="">{loading ? "Đang tải…" : "Chọn sản phẩm"}</option>
      {products.map(product => <option key={product.id} value={product.id}>{product.name} ({product.code})</option>)}
    </Select>
    {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    {loadError && <p role="alert" className="mt-1 text-xs text-danger">Không tải được danh sách sản phẩm. <button type="button" className="underline" onClick={reload}>Tải lại</button></p>}
  </div>;
}

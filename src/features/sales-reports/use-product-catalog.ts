"use client";
import { useCallback, useMemo } from "react";
import { useRemote } from "@/features/operations/ui";
import { productRepository } from "@/features/products/repository";

export type CatalogProduct = Readonly<{ id: string; code: string; name: string; categoryName: string | null }>;

/**
 * Danh mục sản phẩm dùng cho báo cáo Hàng hóa: nguồn của ô chọn sản phẩm, của mã hàng (link sang chi tiết) và của nhóm hàng khi gộp phần Bán hàng
 * (báo cáo bán hàng của backend chỉ trả id và tên sản phẩm). Không đọc được danh mục thì báo cáo vẫn xem được, chỉ thiếu mã/nhóm.
 */
export function useProductCatalog() {
  const remote = useRemote(useCallback((signal: AbortSignal) => productRepository.all({}, signal), []));
  const products = useMemo<Map<string, CatalogProduct>>(() => new Map((remote.data ?? []).map((row) => [row.id, { id: row.id, code: row.code, name: row.name, categoryName: row.categoryName ?? null }])), [remote.data]);
  const options = useMemo(() => [...products.values()].map((row) => ({ id: row.id, label: row.name })).sort((a, b) => a.label.localeCompare(b.label, "vi", { numeric: true })), [products]);
  return { products, options, loading: remote.loading, error: remote.error, reload: remote.reload };
}
export type ProductCatalog = ReturnType<typeof useProductCatalog>;

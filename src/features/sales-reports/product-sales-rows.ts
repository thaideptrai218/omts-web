import type { SalesGroup } from "./contracts";
import type { CatalogProduct } from "./use-product-catalog";

/** Một dòng của bảng Bán hàng theo hàng hóa: một sản phẩm, một nhóm hàng (khi gộp) hoặc một khoản điều chỉnh của hóa đơn. Không có số hóa đơn vì một hóa đơn có thể nằm ở nhiều sản phẩm. */
export type ProductSalesRow = Readonly<{
  key: string; label: string; code: string | null; soldKg: number; revenue: number; priceCuts: number; salesReturns: number; netRevenue: number;
  /** Khoản điều chỉnh không gắn với sản phẩm (chiết khấu hóa đơn, phụ thu, giảm giá sau bán): không vẽ lên biểu đồ top. */
  adjustment: boolean;
}>;

/** Backend trả các khoản điều chỉnh của hóa đơn thành nhóm riêng khi gộp theo sản phẩm; đổi sang tên tiếng Việt. */
const ADJUSTMENTS: Readonly<Record<string, string>> = { discounts: "Chiết khấu hóa đơn", "other-charges": "Phụ thu", "price-cuts": "Giảm giá sau bán" };
const NO_CATEGORY = "Chưa phân nhóm";

const toRow = (group: SalesGroup, label: string, code: string | null, adjustment: boolean): ProductSalesRow => ({
  key: group.key, label, code, adjustment, soldKg: group.soldKg, revenue: group.revenue, priceCuts: group.priceCuts, salesReturns: group.salesReturns, netRevenue: group.netRevenue,
});
const isEmpty = (row: ProductSalesRow) => !row.soldKg && !row.revenue && !row.priceCuts && !row.salesReturns && !row.netRevenue;

/**
 * Dòng bảng Bán hàng theo hàng hóa, đã sắp theo doanh thu thuần giảm dần. Mã hàng và nhóm hàng lấy từ danh mục sản phẩm (báo cáo bán hàng chỉ có id và tên);
 * `merge` gộp các sản phẩm cùng nhóm hàng thành một dòng. Khoản điều chỉnh bằng 0 được ẩn, khoản khác 0 giữ ở cuối để cộng đủ dòng tổng.
 */
export function buildProductSalesRows(groups: readonly SalesGroup[], catalog: ReadonlyMap<string, CatalogProduct>, merge: boolean): ProductSalesRow[] {
  const products: ProductSalesRow[] = [], adjustments: ProductSalesRow[] = [], byCategory = new Map<string, ProductSalesRow>();
  for (const group of groups) {
    const adjustment = ADJUSTMENTS[group.key];
    if (adjustment) { adjustments.push(toRow(group, adjustment, null, true)); continue; }
    const product = catalog.get(group.key);
    if (!merge) { products.push(toRow(group, group.label, product?.code ?? null, false)); continue; }
    const category = product?.categoryName ?? NO_CATEGORY, current = byCategory.get(category), row = toRow(group, category, null, false);
    byCategory.set(category, current ? { ...current, soldKg: current.soldKg + row.soldKg, revenue: current.revenue + row.revenue, priceCuts: current.priceCuts + row.priceCuts,
      salesReturns: current.salesReturns + row.salesReturns, netRevenue: current.netRevenue + row.netRevenue } : { ...row, key: `category:${category}` });
  }
  const main = merge ? [...byCategory.values()] : products;
  return [...main.sort((a, b) => b.netRevenue - a.netRevenue), ...adjustments.filter((row) => !isEmpty(row))];
}

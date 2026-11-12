"use client";
import { useCallback, useState } from "react";
import type { SortKey } from "./yield-rows";

export type ColumnKey = "lotCount" | "cages" | "estimatedKg" | "kgPerCage" | "target" | "soldKg" | "remainingKg" | "lastHarvest" | "daysToLast" | "status";
export type ColumnDef = { key: ColumnKey; label: string; sort?: SortKey; num?: boolean };

/** Các cột chọn được của bảng (cột nhóm luôn hiện). `sort` là khóa sắp xếp tương ứng; cột trạng thái không sắp xếp. */
export const yieldColumns: readonly ColumnDef[] = [
  { key: "lotCount", label: "Số lô", sort: "lotCount", num: true },
  { key: "cages", label: "Số lồng", sort: "cages", num: true },
  { key: "estimatedKg", label: "Kg ước tính", sort: "estimatedKg", num: true },
  { key: "kgPerCage", label: "Kg/lồng", sort: "kgPerCage", num: true },
  { key: "target", label: "So với mục tiêu", sort: "targetPct" },
  { key: "soldKg", label: "Đã bán", sort: "soldKg", num: true },
  { key: "remainingKg", label: "Còn để bán", sort: "remainingKg", num: true },
  { key: "lastHarvest", label: "Thu gần nhất", sort: "lastHarvest", num: true },
  { key: "daysToLast", label: "Ngày nuôi đến lần thu cuối", sort: "daysToLast", num: true },
  { key: "status", label: "Trạng thái số liệu" },
];
export const allColumnKeys = yieldColumns.map((column) => column.key);
const storageKey = "omts.harvest-yield.columns";

/** Cột đang hiện, nhớ theo trình duyệt; giá trị lưu hỏng hoặc lạ thì quay về mặc định (hiện tất cả). */
export function useVisibleColumns() {
  const [visible, setVisible] = useState<string[]>(() => {
    if (typeof window === "undefined") return allColumnKeys;
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      const keys = Array.isArray(stored) ? stored.filter((key): key is ColumnKey => allColumnKeys.includes(key)) : [];
      return keys.length ? keys : allColumnKeys;
    } catch { return allColumnKeys; }
  });
  const change = useCallback((keys: string[]) => {
    setVisible(keys);
    try { window.localStorage.setItem(storageKey, JSON.stringify(keys)); } catch { /* trình duyệt chặn lưu: vẫn dùng được trong phiên */ }
  }, []);
  return { visible, change };
}

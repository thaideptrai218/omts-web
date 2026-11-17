"use client";
import { useCallback } from "react";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import cashStyles from "@/features/cash-book/cash-book.module.css";
import { NameTab, type Row } from "@/features/input-items/inventory-settings";
import { groupTree } from "@/features/input-items/item-helpers";
import { useRemote } from "@/features/operations/ui";
import { canReadProducts } from "./product-permissions";
import { productRepository } from "./repository";

/**
 * Thiết lập → Sản phẩm: the product groups (two levels, in the order they are listed everywhere). The unit list is the one shared with Vật tư & Giống,
 * so it is kept there. Only the Owner changes the groups.
 */
export function ProductSettings() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner", canRead = canReadProducts(identity, permissions.functionPermissions);
  const groups = useRemote(useCallback((signal: AbortSignal) => canRead ? productRepository.groups(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canRead]));
  if (!canRead) return <p role="alert">Bạn không có quyền xem thiết lập này.</p>;
  const data = groups.data;
  const rows: Row[] | undefined = data && groupTree(data).map((row) => ({
    id: row.id, name: row.name, rowVersion: row.rowVersion, count: row.itemCount, parentId: row.parentId, depth: row.depth, hasChildren: data.some((child) => child.parentId === row.id),
  }));
  return <div className={managementStyles.theme}>
    <NameTab noun="nhóm sản phẩm" maxLength={100} rows={rows} loading={groups.loading} error={groups.error} reload={groups.reload} canManage={owner} countLabel="Số sản phẩm" tree
      save={(name, row, parentId) => productRepository.saveGroup(name, row?.id, row?.rowVersion, parentId)} remove={(row) => productRepository.removeGroup(row.id)} reorder={(ids) => productRepository.reorderGroups(ids)} />
    <p className={`${cashStyles.muted} ${cashStyles.after}`}>Đơn vị tính dùng chung với Vật tư & Giống: thêm hoặc đổi tên ở Thiết lập → Vật tư & Giống → Đơn vị tính. Đơn vị gốc của sản phẩm luôn là kg.</p>
  </div>;
}

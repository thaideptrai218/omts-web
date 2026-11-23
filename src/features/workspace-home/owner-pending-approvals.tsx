"use client";
import type { RemoteView } from "@/features/api-workspace/overview-card";
import type { Dashboard } from "@/features/api-workspace/overview-contracts";
import { HomeBlock } from "./home-block";
import { approvalItems } from "./home-selection";

/**
 * "Chờ chủ duyệt" của Chủ HTX: yêu cầu mua, khiếu nại chất lượng, nghỉ phép/sửa chấm công, bảng lương.
 * Dùng chính số liệu api/dashboard đang tải cho màn Tổng quan (pendingTasks), không gọi thêm API.
 */
export function OwnerPendingApprovals({ remote }: Readonly<{ remote: RemoteView<Dashboard> }>) {
  return <HomeBlock title="Chờ chủ duyệt" remote={remote} empty="Không có việc nào đang chờ bạn duyệt."
    rows={(data) => approvalItems(data.pendingTasks.groups).map((item) => ({ key: item.kind, title: `${item.count} ${item.title.charAt(0).toLocaleLowerCase("vi")}${item.title.slice(1)}`, href: item.href }))} />;
}

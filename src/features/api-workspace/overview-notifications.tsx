"use client";
import Link from "next/link";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { operationAllowed, type OperationArea } from "@/features/operations/permissions";
import { vnd } from "@/features/sales-reports/report-format";
import { OverviewCard, type RemoteView } from "./overview-card";
import type { Dashboard } from "./overview-contracts";
import styles from "./owner-overview.module.css";

type Notice = Readonly<{ key: string; title: string; detail?: string; href: string; area: OperationArea }>;

// Việc chờ của Chủ hợp tác xã theo loại (backend: PendingTaskKinds) và màn xử lý tương ứng.
const TASKS: Readonly<Record<string, { title: string; href: string; area: OperationArea }>> = {
  PurchaseRequest: { title: "Yêu cầu mua chờ phản hồi", href: "/operations/purchase-requests", area: "purchase-requests" },
  QualityClaim: { title: "Khiếu nại chất lượng chờ xử lý", href: "/operations/quality-claims", area: "quality-claims" },
  Payroll: { title: "Bảng lương chờ xử lý", href: "/operations/payroll", area: "payroll" },
  EmployeeRequest: { title: "Yêu cầu nhân sự chờ duyệt", href: "/operations/workforce", area: "workforce" },
};

/** Các thông báo cần chú ý từ số liệu tổng quan; mỗi mục dẫn tới màn xử lý và chỉ hiện khi người xem được mở màn đó. */
function buildNotices(data: Dashboard): Notice[] {
  const { dueDebts, receivables } = data, due = dueDebts.overdueCount + dueDebts.dueSoonCount;
  const notices: Notice[] = [];
  if (dueDebts.policyEnabled && due > 0) notices.push({ key: "debts", title: `${dueDebts.overdueCount} khách quá hạn nợ, ${dueDebts.dueSoonCount} khách sắp đến hạn`, detail: `Tổng nợ khách ${vnd(receivables.receivables)}`, href: "/operations/customer-report", area: "customer-report" });
  else if (dueDebts.debtorCount > 0) notices.push({ key: "debts", title: `${dueDebts.debtorCount} khách hàng còn nợ`, detail: `Tổng nợ ${vnd(receivables.receivables)}${receivables.owedBack > 0 ? ` · cần hoàn lại khách ${vnd(receivables.owedBack)}` : ""}`, href: "/operations/customer-report", area: "customer-report" });
  if (data.waterAlerts.count > 0) notices.push({ key: "water", title: `${data.waterAlerts.count} vùng có cảnh báo chất lượng nước`, detail: "Số đo vượt ngưỡng đã đặt", href: "/operations/water", area: "water" });
  if (data.openHarvestLots.count > 0) notices.push({ key: "lots", title: `${data.openHarvestLots.count} lô thu hoạch đang mở`, detail: "Lô chưa đóng, cần cân hoặc chốt", href: "/farming/harvest-lots", area: "harvest" });
  for (const group of data.pendingTasks.groups) {
    const task = TASKS[group.kind];
    if (task && group.count > 0) notices.push({ key: group.kind, title: `${group.count} ${task.title.charAt(0).toLocaleLowerCase("vi")}${task.title.slice(1)}`, href: task.href, area: task.area });
  }
  return notices;
}

type Props = Readonly<{ remote: RemoteView<Dashboard>; identity: Readonly<{ subjectType: string }>; permissions: readonly FunctionPermission[] }>;

/** Thông báo: công nợ đến hạn, cảnh báo nước, lô thu hoạch đang mở và việc chờ xử lý, mỗi mục là một liên kết. */
export function OverviewNotifications({ remote, identity, permissions }: Props) {
  return (
    <OverviewCard title="Thông báo" remote={remote}>
      {(data) => {
        const notices = buildNotices(data).filter((notice) => operationAllowed(notice.area, identity, permissions));
        return notices.length
          ? <ul className={styles.feed}>{notices.map((notice) => <li key={notice.key}><Link href={notice.href} className={styles.row}><div><strong>{notice.title}</strong>{notice.detail && <small>{notice.detail}</small>}</div><span aria-hidden="true">→</span></Link></li>)}</ul>
          : <p className={styles.empty}>Hiện không có việc nào cần chú ý.</p>;
      }}
    </OverviewCard>
  );
}

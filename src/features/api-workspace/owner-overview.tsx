"use client";
import { operationAllowed } from "@/features/operations/permissions";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { OwnerPendingApprovals } from "@/features/workspace-home/owner-pending-approvals";
import { useApiWorkspace } from "./api-workspace-shell";
import { OverviewNotifications } from "./overview-notifications";
import { OverviewRecentActivity } from "./overview-recent-activity";
import { OverviewRevenueChart } from "./overview-revenue-chart";
import { OverviewTodayTiles } from "./overview-today-tiles";
import { OverviewTopLists } from "./overview-top-lists";
import { useOverviewData } from "./use-overview-data";
import styles from "./owner-overview.module.css";

/**
 * Tổng quan của Chủ hợp tác xã và Kế toán: kết quả bán hàng hôm nay so với hôm qua, doanh thu thuần tháng này,
 * top 10 hàng và khách, thông báo cần chú ý và hoạt động gần đây. Theo vùng đang chọn ở thanh trên.
 */
export function OwnerOverview() {
  const { identity, permissions } = useApiWorkspace();
  const grants = permissions.functionPermissions;
  const isOwner = identity.subjectType === "CooperativeOwner";
  const data = useOverviewData(isOwner);
  const dashboard = { data: data.dashboard.data, loading: data.dashboard.loading, error: data.dashboard.error, reload: data.dashboard.reload };
  const day = data.byDay.report, zone = data.byZone.report, product = data.byProduct.report, customer = data.byCustomer.report;
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div><h1>Tổng quan</h1><p>Kết quả bán hàng hôm nay {formatVietnameseDate(data.today)} và tình hình trong tháng.</p></div>
        <span className={styles.scope}>Phạm vi: {data.zoneLabel}</span>
      </header>
      {data.multiZone && <p className={styles.note} role="note">Mục &ldquo;Kết quả hôm nay&rdquo; và &ldquo;Thông báo&rdquo; tính cho toàn hợp tác xã khi chọn nhiều vùng; các biểu đồ và bảng xếp hạng theo đúng vùng đã chọn.</p>}
      <OverviewTodayTiles data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.reload} />
      <div className={styles.layout}>
        <div className={styles.column}>
          <OverviewRevenueChart byDay={day} byZone={zone} from={data.from} to={data.today} />
          <OverviewTopLists byProduct={product} byCustomer={customer}
            reportHref={operationAllowed("sales-report", identity, grants) ? "/operations/sales-report" : undefined}
            customerHref={operationAllowed("customer-report", identity, grants) ? "/operations/customer-report" : undefined} />
        </div>
        <div className={styles.column}>
          {isOwner && <OwnerPendingApprovals remote={dashboard} />}
          <OverviewNotifications remote={dashboard} identity={identity} permissions={grants} withTasks={!isOwner} />
          {isOwner && <OverviewRecentActivity remote={data.activity} />}
        </div>
      </div>
    </section>
  );
}

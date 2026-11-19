"use client";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { ReportCard, ReportTable } from "./report-parts";
import { salesGroupColumns } from "./sales-report-columns";
import { useSalesReport, type SalesReportQuery } from "./use-sales-report";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Props = Readonly<{ customerKey: string; label: string; base: Omit<SalesReportQuery, "groupBy" | "customerId"> }>;

/** Sản phẩm một khách đã mua trong kỳ (cùng báo cáo, gộp theo sản phẩm, lọc theo khách). Khách lẻ không có hồ sơ nên không có khối này. */
export function CustomerProductsCard(props: Props) {
  return GUID.test(props.customerKey) ? <ProductsOfCustomer {...props} /> : null;
}

function ProductsOfCustomer({ customerKey, label, base }: Props) {
  const { report } = useSalesReport("customer-report", { ...base, groupBy: "product", customerId: customerKey });
  return (
    <ReportCard title={`Sản phẩm ${label} đã mua`}>
      {report.loading && <p role="status" className="text-sm text-text-muted">Đang tải sản phẩm...</p>}
      {report.error && <ListStateMessage error={report.error} onRetry={report.reload} />}
      {report.data && !report.data.groups.length && <ListStateMessage>{report.data.message ?? "Khách này chưa mua sản phẩm nào trong kỳ."}</ListStateMessage>}
      {report.data && report.data.groups.length > 0 && <ReportTable caption={`Sản phẩm ${label} đã mua`} rowKey={(group) => group.key} rows={report.data.groups}
        columns={salesGroupColumns({ groupBy: "product", totals: report.data.totals })} />}
    </ReportCard>
  );
}

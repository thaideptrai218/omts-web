"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { DataTable, ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { readPermissionFunctions } from "./account-grants-repository";
import { rolePermissionsSchema } from "./grant-contract";
const actions = { View: "Xem", Create: "Tạo", Edit: "Sửa", Delete: "Xóa", Export: "Xuất", Import: "Nhập", Approve: "Duyệt", Publish: "Công bố" };
const names: Record<string, string> = { CULTIVATION_CYCLES: "Chu kỳ, thả giống và tiến độ", CULTIVATION_LOGS: "Nhật ký nuôi và loại bỏ", WATER_MEASUREMENTS: "Theo dõi chất lượng nước", HARVESTS: "Kế hoạch và ghi nhận thu hoạch", HARVEST_LOTS: "Lô thu hoạch và truy nguồn", PROVENANCE: "Công bố truy xuất và mã QR", SUPPLIERS: "Nhà cung cấp", PURCHASE_RECEIPTS: "Phiếu nhập và trả hàng", SUPPLIER_PAYMENTS: "Thanh toán và nợ nhà cung cấp", CUSTOMERS: "Khách hàng", PURCHASE_REQUESTS: "Yêu cầu mua hàu", SALES_INVOICES: "Hóa đơn bán hàng", QUALITY_CLAIMS: "Khiếu nại và trả hàng bán", CUSTOMER_PAYMENTS: "Khách hàng thanh toán", CUSTOMER_DEBTS: "Công nợ khách hàng", LABOR_WORKERS: "Lao động thời vụ và tổ đội", WORK_ASSIGNMENTS: "Giao việc và xác nhận khoán", ATTENDANCE: "Chấm công", PAY_RULES: "Đơn giá lương", PAYROLL: "Lập bảng lương và trả lương", SALES_REPORTS: "Báo cáo bán hàng", DASHBOARD_DAILY_REVENUE: "Tổng quan HTX · Doanh thu ngày", DASHBOARD_RECEIVABLES: "Tổng quan HTX · Công nợ phải thu", DASHBOARD_OPEN_HARVEST_LOTS: "Tổng quan HTX · Lô thu hoạch đang mở", DASHBOARD_WATER_ALERTS: "Tổng quan HTX · Cảnh báo chất lượng nước", DASHBOARD_PENDING_TASKS: "Tổng quan HTX · Công việc chờ xử lý" };
export function RolePermissionReadView({ record }: { record: ApiRecord }) {
  const loadCatalog = useCallback((signal: AbortSignal) => readPermissionFunctions(signal), []);
  const catalog = useRemote(loadCatalog), parsed = rolePermissionsSchema.safeParse(record.permissions);
  return <section aria-label="Ma trận quyền của vai trò" className="mt-5 space-y-4 border-t border-border pt-4"><h2 className="text-xl font-semibold">Ma trận quyền của vai trò</h2>
    {typeof record.description === "string" && record.description && <p>{record.description}</p>}
    {catalog.loading && <Skeleton />}<ErrorNotice error={catalog.error} />
    {catalog.error && <Button className="w-auto" variant="secondary" onClick={catalog.reload}>Tải lại danh mục quyền</Button>}
    {!parsed.success && <ErrorNotice error="Chưa thể đọc ma trận quyền của vai trò." />}
    {catalog.data && parsed.success && <><DataTable headings={["Chức năng", ...Object.values(actions), "Khác", "Phạm vi"]} empty={catalog.data.length === 0}>
      {catalog.data.map((fn) => { const permission = parsed.data.find((value) => value.functionCode === fn.code); return <tr key={fn.code}>
        <td className="min-w-48 font-semibold">{names[fn.code] || fn.name}</td>{Object.keys(actions).map((action) => <td key={action}>{fn.supportedActions.includes(action) ? permission?.actions.includes(action) ? "Có" : "Không" : "Không áp dụng"}</td>)}
        <td>{permission?.actions.filter((action) => !Object.hasOwn(actions, action)).join(", ") || "—"}</td><td>{!permission?.actions.length ? "Chưa cấp" : fn.cooperativeWide ? "Toàn HTX" : permission.dataScope === "OwnRecords" ? "Bản ghi của mình" : permission.dataScope === "AssignedZone" ? "Trong vùng được cấp" : "Trong vùng được cấp"}</td>
      </tr>; })}
    </DataTable>{parsed.data.filter((row) => !catalog.data!.some((fn) => fn.code === row.functionCode)).map((row) => <p key={row.functionCode}>{row.functionCode}: {row.actions.join(", ") || "Chưa cấp"}</p>)}</>}
  </section>;
}

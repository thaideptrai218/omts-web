"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { DataTable, ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { readPermissionFunctions, readRoleImpact } from "./account-grants-repository";
import { rolePermissionsSchema } from "./grant-contract";
const actions = { View: "Xem", Create: "Tạo", Edit: "Sửa", Delete: "Xóa", Export: "Xuất", Import: "Nhập", Approve: "Duyệt", Publish: "Công bố" };
const names: Record<string, string> = { CULTIVATION_CYCLES: "Chu kỳ, thả giống và tiến độ", CULTIVATION_LOGS: "Nhật ký nuôi và loại bỏ", WATER_MEASUREMENTS: "Đo nước", HARVESTS: "Kế hoạch và ghi nhận thu hoạch", HARVEST_LOTS: "Lô thu hoạch và truy nguồn", PROVENANCE: "Công bố truy xuất và QR", SUPPLIERS: "Nhà cung cấp", PURCHASE_RECEIPTS: "Phiếu nhập và trả hàng", SUPPLIER_PAYMENTS: "Thanh toán và nợ nhà cung cấp", CUSTOMERS: "Khách hàng", PURCHASE_REQUESTS: "Yêu cầu mua hàng", SALES_INVOICES: "Hóa đơn bán hàng", QUALITY_CLAIMS: "Khiếu nại và trả hàng bán", CUSTOMER_PAYMENTS: "Khách hàng thanh toán", CUSTOMER_DEBTS: "Công nợ khách hàng", LABOR_WORKERS: "Lao động thời vụ và tổ đội", WORK_ASSIGNMENTS: "Giao việc và xác nhận khoán", ATTENDANCE: "Chấm công", PAY_RULES: "Đơn giá lương", PAYROLL: "Lập bảng lương và trả lương", SALES_REPORTS: "Báo cáo bán hàng", DASHBOARD_DAILY_REVENUE: "Dashboard · Doanh thu ngày", DASHBOARD_RECEIVABLES: "Dashboard · Công nợ phải thu", DASHBOARD_OPEN_HARVEST_LOTS: "Dashboard · Lô thu hoạch đang mở", DASHBOARD_WATER_ALERTS: "Dashboard · Cảnh báo nước", DASHBOARD_PENDING_TASKS: "Dashboard · Công việc chờ xử lý" };
export function RolePermissionReadView({ record }: { record: ApiRecord }) {
  const loadCatalog = useCallback((signal: AbortSignal) => readPermissionFunctions(signal), []), loadImpact = useCallback((signal: AbortSignal) => readRoleImpact(record.id, signal), [record.id]);
  const catalog = useRemote(loadCatalog), impact = useRemote(loadImpact), parsed = rolePermissionsSchema.safeParse(record.permissions);
  return <section aria-label="Ma trận quyền của vai trò" className="mt-5 space-y-4 border-t border-border pt-4"><h2 className="text-xl font-semibold">Ma trận quyền của vai trò</h2>
    {typeof record.description === "string" && record.description && <p>{record.description}</p>}
    {impact.loading && <Skeleton />}<ErrorNotice error={impact.error} />
    {impact.error && <Button className="w-auto" variant="secondary" onClick={impact.reload}>Tải lại phạm vi sử dụng</Button>}
    {impact.data && <div className="space-y-2 rounded-control bg-surface-subtle p-3"><p>{impact.data.accountCount} tài khoản · {impact.data.zoneCount} vùng cụ thể{impact.data.allZonesGranted ? " · Có cấp Tất cả vùng" : ""}</p>{impact.data.accounts.length > 0 && <details><summary className="cursor-pointer font-semibold">Tài khoản đang dùng</summary><ul className="mt-2 space-y-1 break-words">{impact.data.accounts.map((account, index) => <li key={`${account}:${index}`}>{account}</li>)}</ul></details>}</div>}
    {catalog.loading && <Skeleton />}<ErrorNotice error={catalog.error} />
    {catalog.error && <Button className="w-auto" variant="secondary" onClick={catalog.reload}>Tải lại danh mục quyền</Button>}
    {!parsed.success && <ErrorNotice error="Chưa thể đọc ma trận quyền của vai trò." />}
    {catalog.data && parsed.success && <><DataTable headings={["Chức năng", ...Object.values(actions), "Khác", "Phạm vi"]} empty={catalog.data.length === 0}>
      {catalog.data.map((fn) => { const permission = parsed.data.find((value) => value.functionCode === fn.code); return <tr key={fn.code}>
        <td className="min-w-48 font-semibold">{names[fn.code] || fn.name}</td>{Object.keys(actions).map((action) => <td key={action}>{fn.supportedActions.includes(action) ? permission?.actions.includes(action) ? "Có" : "Không" : "Không áp dụng"}</td>)}
        <td>{permission?.actions.filter((action) => !Object.hasOwn(actions, action)).join(", ") || "—"}</td><td>{!permission?.actions.length ? "Chưa cấp" : fn.cooperativeWide ? "Toàn HTX" : permission.dataScope === "OwnRecords" ? "Bản ghi của mình" : permission.dataScope === "AssignedZone" ? "Trong vùng được cấp" : permission.dataScope}</td>
      </tr>; })}
    </DataTable>{parsed.data.filter((row) => !catalog.data!.some((fn) => fn.code === row.functionCode)).map((row) => <p key={row.functionCode}>{row.functionCode}: {row.actions.join(", ") || "Chưa cấp"} · {row.dataScope}</p>)}</>}
  </section>;
}

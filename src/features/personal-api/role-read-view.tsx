"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { DataGrid } from "@/components/ui/data-grid";
import styles from "./role-read-view.module.css";
import { Field, Select, Paging, ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { readPermissionFunctions } from "./account-grants-repository";
import { rolePermissionsSchema } from "./grant-contract";
const actions = { View: "Xem", Create: "Tạo", Edit: "Sửa", Delete: "Xóa", Export: "Xuất", Import: "Nhập", Approve: "Duyệt", Publish: "Công bố" };
const names: Record<string, string> = { LOT_TRACING: "Truy xuất lô hàng", SALES_RETURNS: "Trả hàng bán", CULTIVATION_CYCLES: "Chu kỳ, thả giống và tiến độ", CULTIVATION_LOGS: "Nhật ký nuôi và loại bỏ", WATER_MEASUREMENTS: "Theo dõi chất lượng nước", HARVESTS: "Kế hoạch và ghi nhận thu hoạch", HARVEST_LOTS: "Lô thu hoạch và truy nguồn", PROVENANCE: "Công bố truy xuất và mã QR", SUPPLIERS: "Nhà cung cấp", PURCHASE_RECEIPTS: "Phiếu nhập và trả hàng", SUPPLIER_PAYMENTS: "Thanh toán và nợ nhà cung cấp", CUSTOMERS: "Khách hàng", PURCHASE_REQUESTS: "Yêu cầu mua hàu", SALES_INVOICES: "Hóa đơn bán hàng", QUALITY_CLAIMS: "Khiếu nại và trả hàng bán", CUSTOMER_PAYMENTS: "Khách hàng thanh toán", CUSTOMER_DEBTS: "Công nợ khách hàng", LABOR_WORKERS: "Lao động thời vụ và tổ đội", WORK_ASSIGNMENTS: "Giao việc và xác nhận khoán", ATTENDANCE: "Chấm công", PAY_RULES: "Đơn giá lương", PAYROLL: "Lập bảng lương và trả lương", SALES_REPORTS: "Báo cáo bán hàng", DASHBOARD_DAILY_REVENUE: "Tổng quan HTX · Doanh thu ngày", DASHBOARD_RECEIVABLES: "Tổng quan HTX · Công nợ phải thu", DASHBOARD_OPEN_HARVEST_LOTS: "Tổng quan HTX · Lô thu hoạch đang mở", DASHBOARD_WATER_ALERTS: "Tổng quan HTX · Cảnh báo chất lượng nước", DASHBOARD_PENDING_TASKS: "Tổng quan HTX · Công việc chờ xử lý" };
const descriptions: Record<string, string> = {
  "Customer payments, money paid back and debts, supplier payments and debts, pay rates, payroll and sales reports; usually granted at All zones.": "Thanh toán, hoàn tiền và công nợ khách hàng; thanh toán và công nợ nhà cung cấp; đơn giá lương, bảng lương và báo cáo bán hàng. Thường được cấp trên tất cả vùng.",
  "Field work in the assigned zones: cultivation, water, harvest, provenance, purchasing, customers, sales invoices at the port, sales returns and workforce.": "Công việc tại các vùng được phân công: nuôi trồng, chất lượng nước, thu hoạch, truy xuất nguồn gốc, mua hàng, khách hàng, hóa đơn bán hàng tại cảng, trả hàng bán và nhân sự.",
};
export function RolePermissionReadView({ record }: { record: ApiRecord }) {
  const loadCatalog = useCallback((signal: AbortSignal) => readPermissionFunctions(signal), []);
  const catalog = useRemote(loadCatalog), parsed = rolePermissionsSchema.safeParse(record.permissions);
  const [search, setSearch] = useState(""), [onlyGranted, setOnlyGranted] = useState(false), [page, setPage] = useState(1);
  const rows = catalog.data?.filter(fn => (!onlyGranted || parsed.success && parsed.data.some(permission => permission.functionCode === fn.code && permission.actions.length > 0)) && `${names[fn.code] || fn.name} ${fn.code}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  const currentPage = Math.min(page, Math.max(1, Math.ceil((rows?.length ?? 0) / 10)));
  return <section aria-label="Ma trận quyền của vai trò" className={styles.matrix}><div className={styles.heading}><h2>Ma trận quyền của vai trò</h2><span>Chỉ xem</span></div>
    {typeof record.description === "string" && record.description && <p className={styles.description}>{descriptions[record.description] ?? record.description}</p>}
    {catalog.loading && <Skeleton />}<ErrorNotice error={catalog.error} />
    {catalog.error && <Button className="w-auto" variant="secondary" onClick={catalog.reload}>Tải lại danh mục quyền</Button>}
    {!parsed.success && <ErrorNotice error="Chưa thể đọc ma trận quyền của vai trò." />}
    {catalog.data && rows && parsed.success && <><div className={styles.filters}><Field label="Tìm chức năng" type="search" placeholder="Tên hoặc mã chức năng…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><Select label="Phạm vi hiển thị" value={onlyGranted ? "granted" : "all"} onChange={event => { setOnlyGranted(event.target.value === "granted"); setPage(1); }}><option value="all">Tất cả chức năng</option><option value="granted">Chức năng được cấp quyền</option></Select></div><p className={styles.count}>{rows.length}/{catalog.data.length} chức năng phù hợp</p>
      <DataGrid responsive headings={["Chức năng", "Thao tác được phép", "Phạm vi dữ liệu"]} empty={rows.length === 0}>
        {rows.slice((currentPage - 1) * 10, currentPage * 10).map(fn => { const permission = parsed.data.find(value => value.functionCode === fn.code); return <tr key={fn.code}>
          <td data-label="Chức năng" className={styles.functionName}>{names[fn.code] || fn.name}</td><td data-label="Thao tác được phép"><div className={styles.actions}>{permission?.actions.length ? permission.actions.map(action => <span key={action}>{actions[action as keyof typeof actions] || action}</span>) : <small>Không có quyền</small>}</div></td><td data-label="Phạm vi dữ liệu" className={styles.scope}>{!permission?.actions.length ? "—" : fn.cooperativeWide ? "Toàn HTX" : permission.dataScope === "OwnRecords" ? "Bản ghi của mình" : "Trong vùng được cấp"}</td>
        </tr>; })}
      </DataGrid>{rows.length > 10 && <div className={styles.paging}><Paging page={currentPage} pageSize={10} total={rows.length} onChange={setPage} /></div>}
      {parsed.data.some(row => !catalog.data!.some(fn => fn.code === row.functionCode)) && <details className={styles.unknown}><summary>Quyền chưa có trong danh mục chức năng</summary>{parsed.data.filter(row => !catalog.data!.some(fn => fn.code === row.functionCode)).map(row => <p key={row.functionCode}>{row.functionCode}: {row.actions.map(action => actions[action as keyof typeof actions] || action).join(", ") || "Chưa cấp"}</p>)}</details>}
    </>}
  </section>;
}

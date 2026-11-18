# Phase 2 – Báo cáo Bán hàng (BE có sẵn)

KiotViet: Doanh thu, Giá trị trả, Doanh thu thuần, Số đơn; lọc thời gian, chi nhánh; biểu đồ hoặc bảng.

## BE có sẵn (không sửa)
`SalesPerformanceReportController` – `GET api/reports/sales-performance`, `/invoices`, `/export`.
Params: `from`, `to`, `groupBy` (customer|product|zone|day|week|month), `zoneIds[]`, `customerIds[]`, `productIds[]`, `groupKey`.
Trả: InvoiceCount, InvoicedKg, Revenue, PriceCuts, SalesReturns, NetRevenue, SoldKg (theo nhóm + tổng). DTO: `Application/Features/Reports/SalesPerformance/SalesPerformanceDtos.cs` – đọc để viết zod khớp 100%.

## Web
1. `src/features/sales-reports/contracts.ts`: zod cho report, group, invoices row.
2. `src/server/operations/sales-report-plan.ts` (theo `harvest-yield-plan.ts`): actions `report`, `invoices`, `export`; permission `SALES_REPORTS` View/Export; query `strictObject`.
3. Viết lại `SalesPerformanceScreen` (bỏ `TODO(api)`):
   - Lọc: kỳ (mặc định tháng này), vùng, khách, sản phẩm; "Xem theo": Thời gian (ngày/tuần/tháng) | Vùng | Sản phẩm | Khách.
   - Ô chỉ số: Số hóa đơn, Doanh thu, Giảm giá/trả, Doanh thu thuần, Kg đã bán.
   - Biểu đồ cột Doanh thu thuần theo nhóm; bảng nhóm có dòng tổng; bấm dòng → danh sách hóa đơn của nhóm (`/invoices?groupKey=`), mã hóa đơn link sang chi tiết hóa đơn.
   - Xuất Excel → `/export` qua `repository.download`.
4. Bật key `sales-report` trên menu.

## Xong khi
- Dữ liệu seed hiển thị khớp tổng ở màn hóa đơn bán cùng kỳ.
- Rỗng → thông báo MSG-GEN-10 từ BE.
- lint/typecheck/vitest `src/features/sales-reports` pass.

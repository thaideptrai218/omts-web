# Web foundation (phase 1-3) - API tóm tắt để tái dùng ở phase 4-8

Thư viện: `recharts@3.10.1` (ghim, 3.11.0 mới ra < 2 tuần) + `react-is@19.3.0`.

## Biểu đồ `src/components/ui/charts/`
- `BarChart` props: `points:{label,values[]}[]`, `series:{name,color?}[]`, `stacked?`, `overlay?:{name,values[]}` (đường trục phải, vd cộng dồn), `reference?:{value,label}` (mốc ngang), `valueFormat`, `axisFormat` (dùng `formatMoneyShort` cho tiền), `ariaLabel`, `loading`, `emptyText`, `height`.
- `LineChart`: cùng props trừ stacked/overlay/reference.
- Có sẵn: chú giải bấm ẩn/hiện, tooltip tiếng Việt, bảng sr-only thay thế, skeleton khi `loading`, trạng thái rỗng.
- `formatMoneyShort(1200000) = "1,2 tr"`. Màu: `CHART_PALETTE` trong `chart-theme.ts`.
- Biểu đồ Sản lượng nuôi (`yield-trend-chart.tsx`) đã chuyển sang `BarChart`.

## Khung báo cáo `src/features/sales-reports/`
- `useReportFilters(defaults, {allowed, guidKeys})`: nháp -> `apply()`; `applied`, `draft`, `change(patch)`, `applyNow(extra)`, `reset()`, `problem`, `query {from,to}` (Toàn thời gian = 5 năm). Ghi URL (`from,to,zones` + khóa riêng); cần `<Suspense>` quanh màn (useSearchParams).
- `ReportFilterRail` (kỳ + vùng + children + Xem báo cáo/Đặt lại; `showZones={false}`), `useReportZones(area)`, `ReportChoice` (nhóm nút chọn 1), `EntityFilter` + `useCustomerOptions/useProductOptions`.
- `ReportPage` (ManagementLayout): props `canView, filters, search, onExport/exporting/exportError, loading, error, onRetry, hasData, emptyMessage` + children; xử lý không quyền / skeleton lần đầu / lỗi + Thử lại / rỗng (MSG-GEN-10). `ReportViewToggle` (Biểu đồ|Bảng).
- `ReportTiles`, `ReportCard`, `ReportTable` (cột `{key,header,numeric,cell,total}`, dòng tổng), `RowLinkButton`; định dạng `vnd/kg/count` (`report-format.ts`).
- Màn đóng khung cũ (`ReportScreenShell`, `ChartFrame`, `FrameTable`) giữ nguyên cho Xu hướng giá / Vấn đề sau bán / bảng lương.

## BFF + quyền
- Thêm báo cáo: contract zod `features/<x>/contracts.ts` -> plan `src/server/operations/<x>-plan.ts` (mẫu `sales-report-plan.ts`: action report|invoices|export, id nối dấu phẩy) -> nhánh trong `operation-plan.ts` và `operation-screen.tsx`.
- Key đã khai báo trong `permissions.ts`: end-of-day-report, product-report, customer-report, supplier-report, financial-report (functionCode SALES_REPORTS). Chưa xong thì nằm trong `unfinishedAreas` (ẩn menu, `operationAllowed=false`): khi làm xong phase thì xóa key khỏi mảng đó.
- Chủ HTX luôn được; Kế toán = Staff có SALES_REPORTS (View/Export, AssignedZone) - phụ thuộc BE cấp quyền.
- Menu "Báo cáo" đã sắp theo thứ tự KiotViet.

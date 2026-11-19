# Phase 7 – Báo cáo Cuối ngày

KiotViet: thống kê giao dịch bán và thu chi trong ngày; lọc theo ngày, phương thức thanh toán.

## BE mới: `GET api/reports/end-of-day`
- `Application/Features/Reports/EndOfDay/` + `IEndOfDayReportQuery` + query EF.
- Params: `date` (mặc định hôm nay UTC+7), `zoneIds[]` (chỉ áp cho hóa đơn/trả hàng – D1), `method` (tùy chọn), `createdBy` (tùy chọn). Quyền `SALES_REPORTS` View/Export.
- Trả 3 khối:
  1. **Bán hàng**: danh sách hóa đơn Completed trong ngày (Mã, Giờ, Khách, Kg, Tổng, Đã thu ngay), trả hàng trong ngày; tổng: số HĐ, doanh thu, trả, doanh thu thuần.
  2. **Thu chi**: thu tiền khách (CustomerPayment theo PaymentDate, trừ hoàn tiền Kind=PaidBack), chi trả NCC (SupplierPayment), phiếu thu/chi khác (CashVoucher); gom theo phương thức/quỹ (Cash/Bank/EWallet). Dùng lại logic `CashBookReader` nếu được.
  3. **Hàng hóa**: kg bán theo sản phẩm trong ngày; lô thu hoạch đã cân trong ngày (số lô, kg).
- `/export` xlsx.

## Web
1. Key `end-of-day-report`, màn `src/features/sales-reports/end-of-day-report-screen.tsx`.
2. Lọc: 1 ngày (DatePickerField, mặc định hôm nay), vùng, phương thức, người tạo (`PersonPicker`).
3. 3 khối thu gọn được; dòng tổng mỗi khối.
4. Nút **In** (`window.print()` + CSS `@media print` ẩn menu/bộ lọc) và Xuất Excel.

## Xong khi
- Tổng thu tiền mặt trong ngày khớp sổ quỹ cùng ngày.
- `dotnet build`; lint/typecheck/vitest pass.

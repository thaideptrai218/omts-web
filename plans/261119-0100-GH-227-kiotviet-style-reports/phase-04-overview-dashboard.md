# Phase 4 – Tổng quan (dashboard)

KiotViet: Kết quả bán hàng hôm nay (so hôm qua), biểu đồ doanh thu (theo thời gian/chi nhánh), top 10 hàng bán chạy, top 10 khách mua nhiều, thông báo, hoạt động gần đây.

## Hiện trạng
- Web: `src/features/api-workspace/owner-overview.tsx` toàn số mẫu cứng + câu "Bản mẫu… API tổng hợp chưa được nối" → **bỏ hết số mẫu và câu này**.
- BE: `GET api/dashboard?from&to&zoneId` (`OperationsDashboardController`, Owner): DailyRevenue(Total, InvoiceCount), Receivables(Receivables, OwedBack), OpenHarvestLots, WaterAlerts, PendingTasks. DTO `Application/Features/Dashboard/OperationsDashboardDtos.cs`.

## BE (mở rộng, không phá field cũ)
Thêm vào DTO dashboard:
- `Today` và `Yesterday`: `{ InvoiceCount, Revenue, ReturnCount, ReturnValue, NetRevenue }` (SalesInvoice Completed theo InvoiceDate; SalesReturn theo ReturnDate).
- `DueDebts`: số khách có công nợ quá hạn/sắp đến hạn 7 ngày (theo PaymentTerm hiện có; nếu không xác định được hạn thì chỉ trả tổng nợ – ghi chú).
Top 10 và chuỗi doanh thu **không thêm vào dashboard**; web gọi `api/reports/sales-performance` (groupBy=day|zone|product|customer) – tránh trùng logic.
Hoạt động gần đây: dùng endpoint audit log sẵn có (xem `src/features/audit-api`), 10 dòng.

## Web
1. `owner-overview.tsx` (tách file nếu >200 dòng: `overview-today-tiles.tsx`, `overview-revenue-chart.tsx`, `overview-top-lists.tsx`, `overview-side-panel.tsx`).
2. Khối "Kết quả hôm nay": 4 ô (Số HĐ, Doanh thu, Trả hàng, Doanh thu thuần) + mũi tên % so hôm qua.
3. Biểu đồ doanh thu thuần: tab "Theo ngày" (tháng này) / "Theo vùng"; dùng `bar-chart`.
4. Top 10 sản phẩm (chuyển Doanh thu ↔ Kg), Top 10 khách theo doanh thu thuần.
5. Cột phải: Thông báo (công nợ đến hạn, cảnh báo nước, lô chờ cân/đang mở, việc chờ) – mỗi mục link tới màn tương ứng; Hoạt động gần đây.
6. Bộ lọc vùng dùng `ZonePicker` toàn cục.

## Xong khi
- Không còn số cứng; số "hôm nay" khớp danh sách hóa đơn ngày hôm nay.
- `dotnet build` BE; lint/typecheck/vitest web pass.

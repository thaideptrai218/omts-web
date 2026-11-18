# Phase 5 – Báo cáo Hàng hóa

KiotViet: mối quan tâm Bán hàng / Lợi nhuận / Giá trị kho / Xuất nhập tồn / Hạn sử dụng; "Gộp theo nhóm hàng".
OMTS: giữ **Bán hàng** và **Xuất nhập tồn (kg)**. Bỏ Hạn sử dụng (hàu sống). Lợi nhuận theo phase-00 D2 (giai đoạn 1 không làm). Giá trị kho = tồn kg × giá niêm yết hiện tại (ghi rõ "theo giá bán niêm yết").

## BE mới: `GET api/reports/product-stock`
- Thư mục `Application/Features/Reports/ProductStock/` (Service, Calculator, ExportService, Dtos) + `IProductStockReportQuery` + `Infrastructure/Persistence/Queries/ProductStockReportQuery.cs`; đăng ký DI cả 2 tầng.
- Params: `from`, `to`, `productIds[]`, `categoryIds[]`, `groupBy` (product|category). Quyền `SALES_REPORTS` View/Export, scope NoZone (ProductStockMovement không có vùng – kiểm tra; nếu có liên kết lô→vùng thì cho `zoneIds`).
- Nguồn: `ProductStockMovement` (QuantityKg có dấu, Kind = Harvest/Sale/Disposal/Return/Reversal/LotClose, OccurredAt).
- Mỗi dòng: Tồn đầu kỳ (Σ trước `from`), Nhập (Harvest + Return), Xuất bán (Sale), Hủy (Disposal + LotClose), Điều chỉnh (Reversal), Tồn cuối, Giá trị tồn cuối = tồn × `Product.UnitPrice`.
- Calculator thuần (không EF) để dễ kiểm.
- `/export` xlsx.

## Web
1. Key `product-report`, màn trong `src/features/sales-reports/product-report-screen.tsx`.
2. Chọn "Mối quan tâm": **Bán hàng** (gọi `sales-performance?groupBy=product`: Kg bán, Doanh thu, Trả, Doanh thu thuần, giá TB) | **Xuất nhập tồn** (gọi `product-stock`).
3. Công tắc "Gộp theo nhóm hàng" (`groupBy=category` / gom ở web theo `categoryName` cho phần Bán hàng).
4. Biểu đồ: top 10 SP theo doanh thu thuần (Bán hàng); cột chồng nhập/xuất (Xuất nhập tồn).
5. Mã SP link sang chi tiết sản phẩm (tab biến động đã có).

## Xong khi
- Tồn cuối của 1 SP khớp tab biến động (`api/products/{id}/movements`) cùng thời điểm.
- `dotnet build`; lint/typecheck/vitest pass.

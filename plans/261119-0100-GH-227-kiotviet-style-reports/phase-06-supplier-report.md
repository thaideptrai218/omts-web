# Phase 6 – Báo cáo Nhà cung cấp

KiotViet: Hàng nhập theo NCC, Công nợ, Thuế VAT nhập. OMTS: bỏ VAT (D3).

## BE mới: `GET api/reports/purchases`
- `Application/Features/Reports/Purchases/` (Service, Calculator, ExportService, Dtos) + `IPurchaseReportQuery` + `Infrastructure/Persistence/Queries/PurchaseReportQuery.cs`.
- Params: `from`, `to`, `groupBy` (supplier|item), `supplierIds[]`, `kind` (Seed|Supply|all). Quyền `SUPPLIER_PAYMENTS` View/Export (D5), scope NoZone.
- Nguồn: `PurchaseReceipt` Completed theo ReceiptDate; tổng phiếu = Σ LineAmount − Discount (không có cột tổng). `PurchaseReturn` (ReturnValue − Discount) theo ReturnDate.
- Mỗi dòng: Số phiếu, Số lượng (theo đơn vị gốc, chỉ khi groupBy=item), Giá trị nhập, Giá trị trả, Nhập thuần.
- `/lines?groupKey=` trả danh sách phiếu của nhóm; `/export` xlsx.

## Web
1. Key `supplier-report`, màn `src/features/sales-reports/supplier-report-screen.tsx`, 2 tab:
   - **Hàng nhập theo NCC**: lọc kỳ, NCC, loại (Giống/Vật tư); "Xem theo" NCC | Mặt hàng; biểu đồ top NCC theo nhập thuần; mở dòng → phiếu nhập (link sang phiếu).
   - **Công nợ**: nhúng/điều hướng màn `supplier-debts` đã có (`src/features/debts-api`) – không viết lại.
2. BFF plan mới `src/server/operations/supplier-report-plan.ts`.

## Xong khi
- Tổng nhập thuần một NCC khớp danh sách phiếu nhập cùng kỳ.
- `dotnet build`; lint/typecheck/vitest pass.

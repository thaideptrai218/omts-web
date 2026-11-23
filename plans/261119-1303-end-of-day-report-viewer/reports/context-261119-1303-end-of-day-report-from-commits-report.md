# Bối cảnh: Báo cáo Cuối ngày (đọc từ commit 19/11)

Nguồn: backend `c9d1e2d4` (#116, gộp #117), web `eedc889` (#16, gộp #17); plan gốc `plans/261119-0100-GH-227-kiotviet-style-reports/` (phase-07); ghi chú `docs/reports/REPORTS_KIOTVIET_STYLE_NOTES_2026-11-19.md`.

## Hiện có
**Backend** `GET api/reports/end-of-day?date&zoneIds&method&createdBy` (+ `/export?format=pdf|xlsx`)
- Quyền `SALES_REPORTS` View/Export (Chủ HTX + Kế toán, D5). Không lưu gì, tính mỗi lần.
- Một ngày duy nhất (`DateOnly`), không có giờ, không có khoảng ngày.
- 3 khối: Bán hàng (hóa đơn không Hủy + phiếu trả Recorded; kg, tổng, đã thu ngay), Thu chi (dòng sổ quỹ Recorded theo quỹ, dùng lại `ICashBookQuery`; chỉ hiện với user mọi vùng), Hàng hóa (kg bán theo sản phẩm + lô đã cân).
- `zoneIds` lọc bán hàng + lô; `method` lọc thu chi; `createdBy` lọc HĐ/phiếu trả/phiếu thu chi.
- File: `EndOfDayDocumentBuilder` → `ReportDocument` (Title, CreatedAt, FilterLines, Sections[Columns, Rows Group/SubGroup/Detail], Footer) → QuestPDF (Noto Sans) / ClosedXML. Khổ giấy cố định, không chọn dọc/ngang. Tiêu đề luôn "…về bán hàng".
- Query: `EndOfDayReportQuery` (EF, số lệnh cố định).

**Web** `src/features/sales-reports/end-of-day-*` (≈330 dòng)
- `ReportPage` + `ReportFilterRail`: Ngày (1 ngày), Vùng, Phương thức thanh toán (Tiền mặt/Ngân hàng/Ví), Người lập.
- 3 khối thu gọn (`EndOfDaySection`), `ReportTiles` + `ReportTable`, nút In (`window.print()` + PRINT_CSS), menu Tải xuống PDF/Excel.
- BFF `src/server/operations/end-of-day-report-plan.ts` (zod strictObject, GUID list ≤50).

**Còn mở từ commit**: in lệch phải; dòng "Người tạo" trong PDF chưa hiện tên; Kế toán 1 vùng bị 403 ở báo cáo toàn HTX; chưa kiểm tra trên trình duyệt / Excel thật / `npm run build`.

## Dữ liệu có sẵn để lọc (nghiên cứu entity)
| Bảng | Trường hữu ích |
|---|---|
| SalesOrder (DH) | OrderedAt/OrderDate, PickupAt, ZoneId, CustomerId, **Source** (App/Phone/AtPort = kênh bán), ReceivedByAccountId (người nhận đặt), CreatedByAccountId, Discount, Subtotal, Total, Status |
| SalesInvoice (HĐ) | InvoicedAt/InvoiceDate, ZoneId, CustomerId, SalesOrderId, Discount, OtherCharges, PriceCutTotal, Subtotal, Total, **PaymentTerm** (PayNow/PayLater), CreatedByAccountId, Status |
| SalesInvoiceLine | ProductId, HarvestLotId, Quantity/Unit, Kg, UnitPrice, Amount |
| SalesReturn (TH) | ReturnDate, InvoiceId, Value, RecordedByAccountId, Lines (ReturnedKg, Outcome) |
| CustomerPayment | PaidAt/PaymentDate, Kind, **Method** (VietQrInvoice/OtherTransfer/Cash/EWallet), Amount, DiscountAmount, InvoiceId/SalesOrderId, CollectedBy, RecordedBy |
| CashVoucher | OccurredAt, Direction, Fund, TypeId (loại thu chi), PartyKind (KH/NCC/NV/Khác), PartyName, CountsInResult, CollectedBy |
| Product | Code, Name, CategoryId (nhóm hàng) |

Không có: VAT, làm tròn, phí trả hàng, chi nhánh (dùng **Vùng nuôi** thay chi nhánh).

## Câu hỏi chưa chốt
Xem plan.md.

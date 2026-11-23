# Báo cáo Cuối ngày: 2 kiểu hiển thị, 4 mối quan tâm, lọc ngày giờ / khoảng ngày

Status: in progress (19/11/2026). Context: `reports/context-261119-1303-end-of-day-report-from-commits-report.md`.

## Quyết định của user (19/11)
- Kiểu hiển thị: **Dạng bảng** (web hiện tại) | **Báo cáo** (trang giấy A4 kiểu KiotViet). Dạng Báo cáo **tự làm bằng HTML** (user cần dấu ⊞/⊟ bấm được trong trang giấy); đã tìm thư viện: EmbedPDF/pdf.js không mở/đóng nhóm được, ActiveReportsJS/Telerik/Stimulsoft thương mại.
- Dạng Báo cáo: chọn **Hiển thị dọc / ngang**; toolbar: Quay lại, Tới, Làm mới, Trang đầu/trước/ô số trang/sau/cuối, Xem trước khi in, Tải xuống (PDF, Excel), In, Phóng to, Thu nhỏ, Tìm, Toàn màn hình.
- Mối quan tâm: **Bán hàng, Thu chi, Hàng hóa, Tổng hợp**.
- Thời gian: (a) chọn ngày + giờ Từ/Đến, (b) khoảng ngày tùy chỉnh. Vùng nuôi = "Chi nhánh".
- Bán hàng: bỏ VAT/Làm tròn/Phí trả hàng; nhóm **Đặt hàng** = DH tạo trong kỳ, Thực thu = tiền cọc nhận trong kỳ, không cộng vào doanh thu tổng.

## Contract backend (mới, thay thế bản cũ; chỉ web dùng)
`GET api/reports/end-of-day?concern=sales|money|goods|summary&from=yyyy-MM-ddTHH:mm&to=yyyy-MM-ddTHH:mm&zoneIds=..&<lọc riêng>`
`GET api/reports/end-of-day/export?...same...&format=pdf|xlsx&orientation=portrait|landscape&expanded=true|false`
- `from`/`to` giờ Việt Nam, bao gồm cả hai đầu (to tính đến hết phút). Mặc định hôm nay 00:00–23:59. `to < from` hoặc khoảng > 366 ngày → 400 MSG-GEN-01 field "to". `date=` cũ vẫn nhận (= cả ngày).
- Lọc riêng (lặp tham số cho danh sách, sai giá trị → 400 field tương ứng; tham số không thuộc concern bị bỏ qua):
  - sales: `customerIds`, `receivedBy` (người nhận đặt DH), `createdBy`, `paymentMethods` (Cash|VietQrInvoice|OtherTransfer|EWallet: chứng từ có ít nhất một khoản thu bằng PT đó), `channels` (App|Phone|AtPort, theo DH; HĐ theo DH gốc), `paymentTerms` (PayNow|PayLater, chỉ HĐ).
  - money: `funds` (Cash|Bank|EWallet), `sources` (CustomerPayment|CustomerPaidBack|SupplierPayment|SupplierPaidBack|CashVoucher), `typeIds` (loại phiếu thu/chi), `partyKinds` (Customer|Supplier|Employee|Other), `createdBy`.
  - goods: `productIds`, `categoryIds`, `customerIds`, `createdBy`.
  - summary: `createdBy`.
- Thời điểm: DH `OrderedAt`, HĐ `InvoicedAt`, phiếu trả `CreatedAt`, thu tiền `PaidAt`, sổ quỹ `OccurredAt`. Bỏ HĐ Hủy, DH Hủy, phiếu trả Hủy, khoản thu Hủy/Chờ chuyển khoản.
- Response chung: `{computedAt, concern, from, to, filters:{zones:[{id,name}], ...tên đã chọn: customers/products/categories/people [{id,name}]}, sales|money|goods|summary: {...}, message, messageCode}` (chỉ khối của concern; summary có cả 3 phần tóm tắt).
  - `sales`: `groups:[{kind:"Order"|"Invoice"|"Return", count, quantityKg, revenue, discount, otherCharges, paid, debt, rows:[{id, code, at, customer:{id,name}|null, zoneName, quantityKg, revenue, discount, otherCharges, paid, debt}]}]`, `totals` (cùng số, Order KHÔNG cộng vào revenue tổng; Return âm). revenue = Subtotal (trước giảm); discount = DiscountAmount + PriceCutTotal; thực thu = khoản thu trong kỳ gắn chứng từ; debt = Total − mọi khoản đã thu (HĐ), 0 cho DH/trả hàng.
  - `money`: `entries:[{source, code, at, direction, fund, typeName|null, partyKind|null, partyName|null, amount, note, createdByName|null}]`, `byFund:[{fund, receipts, payments, net}]`, `totals`.
  - `goods`: `products:[{productId, code, name, unit:"kg", soldKg, revenue, returnedKg, returnValue, netRevenue, details:[{documentId, code, kind:"Invoice"|"Return", at, customerName|null, kg, value}]}]`, `totals`. revenue đã phân bổ giảm giá HĐ theo tỷ lệ Amount dòng; ghi chú "(Đã phân bổ giảm giá hóa đơn)". `lots` (lô đã cân trong kỳ) giữ như cũ.
  - `summary`: `{sales:{orderCount, orderValue, deposits, invoiceCount, revenue, discount, returnCount, returnValue, netRevenue, paid, debt}, money:{byFund, totals}, goods:{productCount, soldKg, returnedKg, lotCount, weighedKg}}`.
- Quyền giữ nguyên (SALES_REPORTS View/Export; money chỉ user mọi vùng).
- `ReportDocument` thêm `Orientation` (Portrait|Landscape) (mã chứng từ vẫn chỉ tô xanh như cũ, không nhúng link). `expanded=true` in kèm dòng chi tiết dưới mỗi sản phẩm (goods). Tiêu đề theo concern: "Báo cáo cuối ngày về bán hàng | thu chi | hàng hóa | tổng hợp". Dòng lọc hiện tên (người, KH, SP), không còn "một tài khoản đã chọn". Tên file `BaoCaoCuoiNgay_{BanHang|ThuChi|HangHoa|TongHop}_{yyyyMMdd}[-{yyyyMMdd}]`.

## Phases
| # | Phase | Owner | Files |
|---|---|---|---|
| 1 | Backend: query/DTO/service/export theo contract, tests unit | backend agent, worktree `D:/omts/.wt/eod-be` branch `feat/end-of-day-report-concerns` | `src/OMTS.*/**/Reports/EndOfDay/*`, `EndOfDayReportQuery.cs`, `IEndOfDayReportQuery.cs`, `Reports/Documents/*`, `Infrastructure/Reports/ReportDocument*Renderer.cs`, controller, tests |
| 2 | Web: contracts/BFF plan, bộ lọc (thời gian 2 kiểu, concern, lọc riêng), Dạng bảng 4 concern, Dạng Báo cáo (trang A4 HTML, toolbar, ⊞/⊟, dọc/ngang, zoom, tìm, in, toàn màn hình, tải PDF/Excel) | web agent, worktree `D:/omts/.wt/eod-web` branch `feat/end-of-day-report-viewer` | `src/features/sales-reports/end-of-day-*`, `src/server/operations/end-of-day-report-plan.ts` (+tests) |
| 3 | Tích hợp: build API, smoke qua BFF, xem trên trình duyệt 1280/360 | controller | — |

## Xong khi
- `dotnet build` + unit tests EndOfDay pass; lint/typecheck/vitest phần sales-reports + server/operations pass.
- Smoke: 4 concern × (1 ngày có giờ, khoảng ngày) trả 200; tổng tiền mặt thu chi khớp sổ quỹ cùng kỳ; export pdf/xlsx dọc + ngang mở được.
- Dạng Báo cáo: chuyển trang, ⊞/⊟, đổi dọc/ngang, zoom, tìm, in chỉ in trang giấy.

## Không làm
VAT, làm tròn, phí trả hàng; lưu báo cáo; gửi định kỳ.

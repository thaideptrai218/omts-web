# Backend: Báo cáo cuối ngày theo 4 concern (worktree `D:/omts/.wt/eod-be`, branch `feat/end-of-day-report-concerns`, chưa commit)

## Kết quả
- `dotnet build` toàn solution (gồm `OMTS.Api.IntegrationTests`, chỉ biên dịch, không chạy): 0 lỗi, 0 cảnh báo.
- `OMTS.Application.UnitTests`: 2096 pass, 5 skip, 3 fail. 3 fail là `MessageCatalogueTests` về `MSG-HARVEST-06` (HarvestNeedsPlan), có sẵn từ commit gốc c9d1e2d4, không liên quan. 88 test `Features.Reports` pass (mới: 4 file EndOfDay*Tests).
- SQL: không chạy với DB thật. Đã kiểm dịch EF sang SQL Server bằng app scratch (`.../scratchpad/eodcheck`, chặn thực thi, in câu lệnh): Sales 4-5 lệnh (kèm bộ lọc đủ loại: 2 lệnh vì `methods` + terms bỏ đơn/trả hàng), Goods 2 lệnh (+1 khi có trả hàng của HĐ cũ), Lots 1, Categories 1, tiền sổ quỹ 1 + tra cứu. Cần smoke với dữ liệu thật.
- Render thử: PDF dọc MediaBox `[0 0 595 842]`, ngang `[0 0 842 595]`; xlsx đúng `Portrait`/`Landscape`.

## Files đổi
Sửa: `src/OMTS.Api/Controllers/EndOfDayReportController.cs`, `src/OMTS.Application/Common/Interfaces/Persistence/IEndOfDayReportQuery.cs`, `.../Reports/Documents/ReportDocument.cs`, `.../Reports/EndOfDay/{EndOfDayDtos,EndOfDayService,EndOfDayExportService,EndOfDayDocumentBuilder}.cs`, `src/OMTS.Infrastructure/Persistence/Queries/EndOfDayReportQuery.cs`, `src/OMTS.Infrastructure/Reports/{ReportDocumentPdfRenderer,ReportDocumentExcelRenderer}.cs`.
Mới: `.../Reports/EndOfDay/EndOfDayPeriod.cs` (parse/validate kỳ), `.../EndOfDayCalculator.cs` (hàm thuần: nhóm bán hàng, phân bổ giảm giá, hàng hóa, thu chi), `tests/OMTS.Application.UnitTests/Features/Reports/EndOfDay{Period,Calculator,Document,Parsing}Tests.cs`.
Không đụng DI (không đăng ký mới), không đụng `UserMessages` (dùng MSG-GEN-01 / MSG-GEN-10 / MSG-GEN-08 sẵn có).

## Contract cuối
Giữ đúng plan. Chỉ khác/bổ sung các điểm trong mục "Khác plan".

`GET api/reports/end-of-day` và `GET api/reports/end-of-day/export` (thêm `format`, `orientation`, `expanded`).

Tham số: `concern` (sales|money|goods|summary, mặc định sales, không phân biệt hoa thường), `from`, `to` (`yyyy-MM-ddTHH:mm`, giây nếu có thì bị bỏ), `date` (`yyyy-MM-dd`, cũ), `zoneIds`. Danh sách lặp tham số, mọi danh sách tối đa 200 phần tử:
- sales: `customerIds`, `receivedBy`, `createdBy`, `paymentMethods`, `channels`, `paymentTerms`
- money: `funds`, `sources`, `typeIds`, `partyKinds`, `createdBy`
- goods: `productIds`, `categoryIds` (gồm nhóm con), `customerIds`, `createdBy`
- summary: `createdBy`
Tham số không thuộc concern bị bỏ qua (không validate). Tham số `method` cũ đã bỏ (thay bằng `funds`).

Kỳ: chỉ `from` => hết ngày của `from`; chỉ `to` => từ 00:00 ngày của `to`; không có gì => hôm nay 00:00-23:59; `date` => cả ngày đó (khi không có from/to). `to` < `from`, > 366 ngày, `to` > 9998-12-31 => 400 field `"to"`. Sai định dạng: `"from"` hoặc `"to"`.

400 MSG-GEN-01, `details.field` + `details.fields` (nhiều lỗi cùng lúc): `concern`, `from`, `to`, `paymentMethods`, `channels`, `paymentTerms`, `funds`, `sources`, `partyKinds`, `typeIds` (id không tồn tại), `categoryIds` (id không tồn tại), `receivedBy`/`createdBy` (account không tồn tại), cộng tên có sẵn của resolver: `Zone`, `Customer`, `Product` (id không tồn tại hoặc >200). Export: `format`, `orientation`. 403 MSG-GEN-08 như cũ (vùng không được phép, hoặc không có quyền).
Giá trị enum nhận tên (không nhận số): PaymentMethods `Cash|VietQrInvoice|OtherTransfer|EWallet`, Channels `App|Phone|AtPort`, PaymentTerms `PayNow|PayLater`, Funds `Cash|Bank|EWallet`, Sources `CustomerPayment|CustomerPaidBack|SupplierPayment|SupplierPaidBack|CashVoucher`, PartyKinds `Customer|Supplier|Employee|Other`.

### Response chung (camelCase, enum là chuỗi)
```json
{
  "computedAt": "2026-11-19T13:20:00+00:00",
  "concern": "sales",
  "from": "2026-11-19T00:00",
  "to": "2026-11-19T23:59",
  "filters": {
    "zones": [{"id":"…","name":"Vùng A"}],
    "customers": [], "products": [], "categories": [],
    "people": [{"id":"…","name":"Lê Thị B"}],
    "receivedBy": [], "createdBy": [{"id":"…","name":"Lê Thị B"}],
    "types": [],
    "paymentMethods": ["Cash"], "channels": [], "paymentTerms": [], "funds": [], "sources": [], "partyKinds": []
  },
  "sales": { … } , "money": null, "goods": null, "summary": null,
  "message": null, "messageCode": null
}
```
Chỉ khối của concern có giá trị, các khối khác `null` (JSON mặc định ghi `null`). `filters`: danh sách rỗng cho thứ không dùng. `people` = người của `receivedBy` + `createdBy` gộp. `zones` rỗng = Tất cả vùng (như cũ). Rỗng dữ liệu: `message` = MSG-GEN-10, `messageCode` = "MSG-GEN-10".

### sales
Luôn đủ 3 nhóm theo thứ tự Order, Invoice, Return (nhóm có thể 0 dòng).
```json
"sales": {
  "groups": [
    {"kind":"Order","count":1,"quantityKg":500,"revenue":5000000,"discount":100000,"otherCharges":0,"paid":1000000,"debt":0,
     "rows":[{"id":"…","code":"DH000001","at":"2026-11-19T09:05:00+07:00","customer":{"id":"…","name":"Nguyễn Văn A"},"zoneName":null,
              "quantityKg":500,"revenue":5000000,"discount":100000,"otherCharges":0,"paid":1000000,"debt":0}]},
    {"kind":"Invoice","count":1,"quantityKg":100,"revenue":1000000,"discount":50000,"otherCharges":20000,"paid":970000,"debt":0,
     "rows":[{"id":"…","code":"HD000001","at":"…","customer":null,"zoneName":"Vùng A","quantityKg":100,"revenue":1000000,"discount":50000,"otherCharges":20000,"paid":970000,"debt":0}]},
    {"kind":"Return","count":1,"quantityKg":-10,"revenue":-400000,"discount":0,"otherCharges":0,"paid":0,"debt":0,
     "rows":[{"id":"…","code":"TL000001","at":"…","customer":null,"zoneName":"Vùng A","quantityKg":-10,"revenue":-400000,"discount":0,"otherCharges":0,"paid":0,"debt":0}]}
  ],
  "totals": {"quantityKg":90,"revenue":600000,"discount":50000,"otherCharges":20000,"paid":1970000,"debt":0,"netRevenue":550000}
}
```
Số liệu:
- Order = DH không Hủy, `OrderedAt` trong kỳ. revenue = Subtotal, discount = DiscountAmount, quantityKg = Σ Quantity×Factor, paid = tiền cọc nhận trong kỳ (thu khách, không Hủy/Chờ chuyển khoản, có `SalesOrderId`, không gắn HĐ).
- Invoice = HĐ không Hủy, `InvoicedAt`. revenue = Subtotal, discount = DiscountAmount + PriceCutTotal, otherCharges = OtherCharges, paid = khoản thu gắn HĐ có `PaidAt` trong kỳ, debt = max(0, Total - giá trị phiếu trả đang hiệu lực - mọi khoản đã thu gắn HĐ).
- Return = phiếu trả Recorded, `CreatedAt`. quantityKg = -Σ ReturnedKg, revenue = -Value (Value = tổng HĐ lúc trả), còn lại 0.
- `totals`: Order KHÔNG vào quantityKg/revenue/discount/otherCharges/debt; `paid` có cộng tiền cọc đơn hàng; `revenue` = Σ HĐ.revenue + Σ trả.revenue (âm); `netRevenue` = revenue - discount.

### money
```json
"money": {
  "entries": [{"source":"CustomerPayment","code":"PT000123","at":"2026-11-19T09:05:00+07:00","direction":"Receipt","fund":"Cash",
               "typeName":"Thu tiền khách hàng","partyKind":"Customer","partyName":"Nguyễn Văn A","amount":500000,"note":null,"createdByName":"Lê Thị B"}],
  "byFund": [{"fund":"Cash","receipts":500000,"payments":0,"net":500000}],
  "totals": {"receipts":500000,"payments":0,"net":500000}
}
```
Dòng sổ quỹ Recorded (qua `ICashBookQuery.ListAsync`, lọc ngày rồi cắt theo giờ `OccurredAt` trong bộ nhớ). 1 lựa chọn funds/typeIds/partyKinds/createdBy đẩy xuống query sổ quỹ, nhiều lựa chọn lọc trong bộ nhớ. Rỗng (`entries: []`) cho user giới hạn vùng. Sắp xếp theo thời gian tăng.

### goods
```json
"goods": {
  "products": [{"productId":"…","code":"H01","name":"Hàu","unit":"kg","soldKg":10,"revenue":270000,"returnedKg":0,"returnValue":0,"netRevenue":270000,
                "details":[{"documentId":"…","code":"HD000001","kind":"Invoice","at":"…","customerName":"Khách A","kg":10,"value":270000}]}],
  "lots": [{"id":"…","lotCode":"LOT-001","zoneName":"Vùng A","weighedKg":120.5,"weighedAt":"2026-11-19T07:30:00+07:00"}],
  "totals": {"soldKg":10,"revenue":270000,"returnedKg":0,"returnValue":0,"netRevenue":270000,"lotCount":1,"weighedKg":120.5}
}
```
revenue/returnValue sau phân bổ giảm giá HĐ (DiscountAmount + PriceCutTotal) theo tỷ lệ Amount dòng, làm tròn đồng, dư vào dòng cuối (theo LineNumber), giảm giá bị chặn tối đa bằng tổng Amount. `details` mỗi (HĐ|phiếu trả) một dòng (nhiều dòng cùng SP trên 1 HĐ gộp). Lọc `productIds`/`categoryIds` áp sau phân bổ (không đổi giá trị dòng). Sắp xếp: soldKg giảm dần rồi tên. SP chỉ có trả hàng vẫn hiện. `lots` không bị lọc theo SP/KH/người tạo; chỉ theo `zoneIds` và kỳ (`WeighedAt`).

### summary
```json
"summary": {
  "sales": {"orderCount":1,"orderValue":4900000,"deposits":1000000,"invoiceCount":1,"revenue":1000000,"discount":50000,"returnCount":1,"returnValue":400000,"netRevenue":550000,"paid":1970000,"debt":0},
  "money": {"byFund":[…],"totals":{"receipts":…,"payments":…,"net":…}},
  "goods": {"productCount":1,"soldKg":10,"returnedKg":0,"lotCount":1,"weighedKg":120.5}
}
```
`orderValue` = Σ(Subtotal - discount) của đơn; `revenue` = Σ HĐ.Subtotal (trước giảm giá); `netRevenue` = revenue - discount - returnValue; `paid` gồm cả `deposits`. Summary chỉ nhận `zoneIds` + `createdBy`.

### Export
`format=xlsx|pdf` (mặc định xlsx), `orientation=portrait|landscape` (mặc định portrait), `expanded=true|false`. Tên file `BaoCaoCuoiNgay_{BanHang|ThuChi|HangHoa|TongHop}_{yyyyMMdd}[-{yyyyMMdd}]` (phần sau khi `to` sang ngày khác `from`). Tiêu đề: "Báo cáo cuối ngày về bán hàng|thu chi|hàng hóa|tổng hợp". Dòng lọc: `Thời gian: dd/MM/yyyy HH:mm - dd/MM/yyyy HH:mm`, `Vùng nuôi: …`, rồi dòng riêng từng concern có tên thật (Khách hàng, Người nhận đặt, Người tạo, Phương thức thanh toán, Kênh bán, Hình thức thanh toán / Quỹ, Nguồn, Loại thu chi, Đối tượng / Nhóm hàng, Hàng hóa, Khách hàng).
- Sales: cột Mã giao dịch, Thời gian, SL (kg), Doanh thu, Giảm giá, Thu khác, Thực thu, Còn nợ; dòng nhóm "Đặt hàng: n" / "Hóa đơn: n" / "Trả hàng: n" (bỏ nhóm 0 dòng) + dòng chi tiết; cuối "Tổng cộng" và "Doanh thu thuần"; ghi chú nhỏ nghiêng dưới bảng. Thời gian `HH:mm` khi kỳ trong một ngày dương lịch, `dd/MM HH:mm` khi kỳ trải nhiều ngày.
- Money: Mã phiếu, Thời gian, Loại thu chi, Đối tượng, Quỹ, Thu, Chi, Ghi chú; nhóm Phiếu thu/Phiếu chi, tổng, tổng theo quỹ (SubGroup), chênh lệch.
- Goods: Mã hàng, Tên hàng, SL bán, Doanh thu, SL trả, Giá trị trả, Doanh thu thuần; ghi chú "(Đã phân bổ giảm giá hóa đơn)"; `expanded=true`: mỗi SP là dòng SubGroup, dưới nó là các dòng Detail của HĐ/phiếu trả (mã chứng từ ở cột đầu); thêm bảng "Lô thu hoạch" nếu có lô.
- Summary: 3 bảng nhỏ (Bán hàng, Thu chi nếu có, Hàng hóa).
- Mô hình tài liệu: `ReportDocument.Orientation` (`ReportOrientation.Portrait|Landscape`, mặc định Portrait, tham số cuối nên chỗ gọi cũ vẫn biên dịch), `ReportSection.Note` (mới). Cả PDF (A4 dọc/ngang) và Excel (page setup) theo `Orientation`. Mã chứng từ vẫn chỉ tô xanh, không nhúng link.

## Khác plan / diễn giải
1. `receivedBy`, `createdBy` nhận danh sách (lặp tham số); 1 giá trị vẫn chạy bình thường.
2. Lọc đơn theo vùng: DH không có vùng (chỉ có `ZoneId` cũ). Khi có `zoneIds` (kể cả vùng tự suy ra của user giới hạn vùng): DH hiện nếu `ZoneId` cũ thuộc vùng, hoặc có ít nhất 1 HĐ của DH thuộc vùng. DH mới chưa giao sẽ không hiện khi lọc vùng.
3. `paymentTerms` (chỉ HĐ): bỏ cả nhóm Đặt hàng; phiếu trả lọc theo kỳ hạn của HĐ gốc.
4. `paymentMethods`: HĐ/DH được giữ nếu có ít nhất một khoản thu trong kỳ bằng PT đó (DH: tiền cọc); phiếu trả bị bỏ (không có phương thức).
5. `channels`/`receivedBy` theo DH gốc; HĐ/phiếu trả không có DH bị loại khi các tham số này có giá trị.
6. Phiếu trả: `revenue` = -Value (giá trị lưu trên phiếu = Total HĐ, đã gồm Thu khác) nên `netRevenue` của HĐ trả toàn bộ có Thu khác sẽ lệch đúng bằng Thu khác. Giá trị trả theo SP dùng phần giảm giá phân bổ, không gồm Thu khác.
7. `filters` thêm `receivedBy`, `createdBy`, `types` và các danh sách enum (ngoài `people` theo plan) để web/file ghi đúng vai trò.
8. Nhãn vùng trong file là "Vùng nuôi" (plan ghi "Vùng nuôi = Chi nhánh", chưa rõ có muốn nhãn "Chi nhánh" không).
9. Tên field lỗi: tham số mới dùng đúng tên tham số query (chữ thường như `categoryIds`); `Zone`/`Customer`/`Product` giữ tên của `ReportFilterResolver` dùng chung với các báo cáo khác.
10. `debt` HĐ trừ cả giá trị phiếu trả đang hiệu lực (HĐ đã trả hàng toàn bộ không còn nợ).
11. Ràng buộc kỳ ở `ReportFilterResolver` (tối đa 5 năm) vẫn chạy, nhưng đã bị giới hạn 366 ngày chặt hơn.

## Câu hỏi mở
- Có muốn nhãn "Chi nhánh" thay cho "Vùng nuôi" trong file và/hoặc tiêu đề bộ lọc không?
- Totals `paid` của Bán hàng gồm tiền cọc: OK với PM? (alternative: tách `deposits` riêng khỏi `paid` ở totals.)
- DH chưa giao không hiện khi lọc vùng (mục 2): chấp nhận hay muốn hiện mọi DH bất kể vùng?
- Cần smoke với dữ liệu thật: khớp tổng thu chi tiền mặt với sổ quỹ cùng kỳ; HĐ có giảm giá + trả hàng; kỳ qua nhiều ngày.

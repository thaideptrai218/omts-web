# Yêu cầu API từ Web cho Backend — 09/11/2026

Căn cứ: backend `develop` `34e686b1` và nhánh `OMTS-224-correct-cancel`, `OMTS-225-claim-submit-respond`. Web đã làm xong mọi màn có API; danh sách dưới đây là phần Web **chưa nối được** vì thiếu endpoint. Mỗi mục ghi màn wireframe, hiện trạng ở Web (tìm `TODO(api)` trong `src/features/**`) và yêu cầu tối thiểu. Không đổi nghiệp vụ; chỉ cần hợp đồng dữ liệu.

## A. Cần để Web chạy trọn vẹn các luồng đã có

| # | Cần | Vì sao | Màn / nơi Web đang chờ |
|---|---|---|---|
| A1 | `GET /api/me/sales-invoices` (+ `GET /api/me/sales-invoices/{id}`): hóa đơn của chính thương lái, không có giá nội bộ | Thương lái chưa chọn được hóa đơn để khiếu nại; `me/purchases` chỉ trả yêu cầu mua, "hóa đơn nối sau" (SALE-10) | SCR-SALE-01 (tab hóa đơn), SCR-CLAIM-01 chọn hóa đơn |
| A2 | Merge `OMTS-224-correct-cancel` (sửa, hủy hóa đơn) | Web đã có hộp thoại sửa/hủy, chỉ hiện khi API trả `corrections` | SCR-SALE-05 tab Chỉnh sửa |
| A3 | Merge `OMTS-225-claim-submit-respond` (khiếu nại chất lượng) | Web đã chạy thật 2 màn khiếu nại trên nhánh này | SCR-CLAIM-01/02 |
| A4 | API phân công và chấm công trên `develop`: `GET /api/workforce/lookups`, `/assignments`, `POST .../check-in|out`, `GET /api/me/workforce`, `/api/me/leave-requests`, nghỉ phép | Có ở nhánh `meeting`/`integration` nhưng không có ở `develop`; màn Phân công và Công việc của tôi lỗi 502 trên `develop` | SCR-LABOR-02/03 |
| A5 | Đặt `PublicBaseUrl` của backend = địa chỉ Web (hiện `http://localhost:3000`) | Mã QR trên hóa đơn dẫn tới `/origin/{token}` của Web | SCR-ORIGIN-01 |
| A6 | Thêm mã thông báo `MSG-SALE-13/14/20/21`, `MSG-CLAIM-03` vào danh mục thống nhất (Web đã có bản tiếng Việt) | BFF chỉ nhận mã có trong danh mục | VietQR, sửa/hủy, khiếu nại |

## B. Màn chưa có API (Web đã dựng khung, nối khi có)

### B1. Phiếu trả hàng bán — SCR-CLAIM-03 (`src/features/sales-returns`)
- `POST /api/sales-invoices/{id}/returns`: tạo phiếu trả hàng bán. Thân: lý do, từng dòng hóa đơn trả lại, lựa chọn **Bán lại** hoặc **Hủy bỏ** cho từng lô.
- `GET /api/sales-invoices/{id}/returns` và `GET .../returns/{returnId}`.
- Phản hồi: giá trị hàng trả, công nợ khách sau khi trả (âm nếu phải trả lại khách), mã thông báo MSG-CLAIM-04. **Máy chủ tính, Web không tự tính tiền.**
- `GET /api/sales-invoices/{id}/quality-claims` (khiếu nại của hóa đơn, hiện chỉ có `GET api/quality-claims` theo bộ lọc).

### B2. Bảng lương — SCR-LABOR-10 (`src/features/payroll`)
- Danh sách bảng lương: lọc theo trạng thái (Nháp, Chờ chốt, Đã trả lại, Đã chốt) và kỳ lương; phân trang.
- `POST` tạo bảng lương cho một kỳ chưa có bảng; `GET` chi tiết gồm phiếu lương từng nhân viên, chi phí nhân công theo bè và chu kỳ nuôi.
- `PUT` điều chỉnh dòng lương, `POST` thêm dòng điều chỉnh (nhân viên chưa có dòng, kể cả đã nghỉ).
- `POST` gửi cho Chủ HTX (kèm danh sách điều kiện chặn: chấm công chưa hoàn tất, giờ chưa có đơn giá); Chủ HTX chốt hoặc trả lại có ghi chú.
- `GET` danh sách chi tiền mặt (tệp .xlsx).
- Ghi chú: `payroll-settings` đã có và Web đã nối.

### B3. Thanh toán lương — SCR-LABOR-11
- `GET` các dòng cần trả của một bảng lương đã chốt (nhân viên, lương, đã trả, còn nợ, tài khoản ngân hàng).
- `POST` ghi nhận thanh toán nhiều nhân viên (ngày chung, tiền mặt/chuyển khoản, mã giao dịch, ghi chú, số tiền từng người); `POST` hủy phiếu thanh toán có lý do.
- `GET` lịch sử phiếu thanh toán của bảng lương.

### B4. Báo cáo bán hàng — SCR-REPORT-01/02/03 (`src/features/sales-reports`)
Mỗi báo cáo cần: truy vấn theo kỳ + bộ lọc, tổng hợp, dòng nhóm (mở rộng ra các hóa đơn/dòng hóa đơn), và xuất tệp.
- REPORT-01 Hiệu quả bán hàng: nhóm theo sáu cách (vùng nuôi, khách hàng, sản phẩm, ...); 5 chỉ số tổng; 10 cột; hóa đơn của nhóm.
- REPORT-02 Xu hướng giá: sản phẩm, kỳ, đơn vị thời gian (ngày/tuần/tháng), vùng; chuỗi giá theo sản phẩm; dòng hóa đơn của kỳ.
- REPORT-03 Vấn đề sau bán: nhóm theo khách hàng/vùng nuôi/lô; khiếu nại, hàng trả, giảm giá sau bán, hóa đơn đã hủy; dòng vấn đề của nhóm.
- Dashboard (SCR-FARM-05) hiện còn dải "bản mẫu": cần API tổng hợp doanh thu theo kỳ, công nợ phải thu, cảnh báo nước, việc chờ xử lý để thay số liệu minh họa.

## C. Nhỏ nhưng nên có
- `GET /api/sales-invoices/{id}/print` và `/export`: trả tên tệp trong `Content-Disposition` (Web sẽ dùng).
- Trạng thái vùng trong `water-measurements/zones`: trả mã ổn định (Web đang suy ra tiếng Việt từ chữ tiếng Anh).
- Thông tin lỗi 400 của backend: trả tên trường lỗi (Web hiện chỉ báo chung "kiểm tra lại thông tin").

## D. Đơn vị lồng

Chủ HTX chốt: thu hoạch tính theo **lồng**, kg chỉ là số ước tính/quy đổi. Backend lưu đúng điều này ở lô thu hoạch (`CageCount`, `KgPerCage`, `EstimatedKg`) nhưng nhiều API chỉ trả kg. Web hiện quy đổi kg → lồng bằng tỷ lệ của chính lô (nếu có) hoặc `AverageKgPerCage` của HTX (chỉ Chủ HTX đọc được `GET api/harvest-settings`), luôn ghi "≈". Người không đọc được tỷ lệ chỉ thấy kg. Để số lồng chính xác cho mọi vai trò, Web đề nghị:

- **D1. `GET api/harvest-lots/for-sale` (`HarvestLotForSale`)**: thêm `cageCount` (int, tổng lồng của lô), `kgPerCage` (decimal, tỷ lệ lúc ghi nhận) và nếu tính được `remainingCages`. Web đã parse sẵn `cageCount`/`kgPerCage` (tùy chọn, nullable) và ưu tiên dùng khi có; hóa đơn vẫn bán theo kg.
- **D2. Báo cáo sản lượng nuôi (`HarvestYieldLot`, `HarvestYieldGroup`, `HarvestYieldTotals`)**: thêm `cageCount` ở dòng lô (số lồng thật của lô) và tổng `cageCount` ở nhóm và tổng cộng; nếu có thể thêm `kgPerCage` ở dòng lô để quy đổi đã bán/hao hụt/chênh lệch chính xác theo từng lô. File Excel xuất ra cũng nên có cột "Số lồng".
- **D3. Yêu cầu mua (`PurchaseRequestView`, `GET api/me/purchases`)**: một trong hai cách: (a) thêm `requestedCages`/`acceptedCages` (thương lái và Chủ HTX nhập/xem theo lồng nếu nghiệp vụ muốn), hoặc (b) cho thương lái đọc `averageKgPerCage` của HTX (ví dụ trong response danh sách sản phẩm hoặc một endpoint đọc tối thiểu), vì hiện thương lái và nhân viên không có quyền `harvest-settings` nên Web chỉ hiển thị kg.
- **D4. Quyền đọc tỷ lệ**: nếu chưa làm D1-D3, mở quyền đọc `averageKgPerCage` (chỉ đọc) cho Kế toán, Quản lý vùng, Nhân viên có quyền xem báo cáo sản lượng/lập hóa đơn để Web quy đổi "≈ N lồng" cho các vai trò đó.
- **Câu hỏi nghiệp vụ**: yêu cầu mua của thương lái nên nhập theo lồng hay kg? Web giữ kg (đúng hợp đồng hiện tại) cho tới khi có quyết định.

## Câu hỏi mở
- A1: thương lái có xem được giá trên hóa đơn của mình không (khiếu nại hiện ẩn giá)?
- B2/B3: bảng lương trả bằng nhiều lần? (Wireframe có "Trả một phần", "Đã trả đủ".)
- Khi `OMTS-224` và `OMTS-225` cùng thêm migration, thứ tự merge nào? (Gộp thử cục bộ hai nhánh đã xung đột cột `ExpiredReminderSentAt` ở các nhánh trước.)

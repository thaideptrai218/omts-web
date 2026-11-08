# Công nợ khách hàng và đọc hóa đơn — 08/11/2026

## Phạm vi đã làm

- Trang API `/operations/customer-debts`, mở từ Điều hành → Công nợ khách hàng. Owner hoặc Staff có CUSTOMER_DEBTS View hiệu lực; không mở cho Trader/Admin hoặc suy quyền từ tên role.
- Tìm tên/số điện thoại ở đầu kết quả; checkbox còn nợ/cần trả lại bên trái; 10/20/50/100 khách mỗi trang. Bộ lọc dấu lấy đủ các trang trước khi lọc và phân trang; dừng khi dữ liệu trùng/thay đổi hoặc quá giới hạn 10.000 bản ghi, không trả danh sách một phần.
- Nhấn dòng khách mở chi tiết ngay bên dưới: Sổ đối chiếu và Hóa đơn chưa trả. Kỳ ngày chỉ áp dụng sổ; công nợ hiện tại và hóa đơn chưa trả không bị giả thành số trong kỳ.
- Tổng phải thu/cần trả lại/số khoản chờ xác nhận lấy nguyên từ API, ghi rõ toàn HTX theo CustomerDebtService.RowsAsync, không tính từ trang đang xem.
- Sổ dùng debtChange cho phát sinh, debtAfter cho dư nợ; hóa đơn hủy giữ lịch sử với phát sinh 0. Không dùng amount gốc để cộng lại công nợ.
- Nhấn mã hóa đơn mở bản đọc chi tiết: khách/vùng/người lập, trạng thái, sản phẩm/lô/kg/giá, giảm giá/thu khác/tổng và khoản thanh toán. Không thêm tạo/sửa/hủy/thu tiền/xác nhận tiền.
- Xuất Excel qua endpoint thật, tách quyền Export, kiểm MIME/kích thước/phiên trước khi tải. Khi chọn một phần bộ lọc dấu, nút xuất bị khóa vì backend chưa nhận bộ lọc đó; hướng dẫn chọn Tất cả, tránh xuất sai phạm vi.
- Route chỉ mở trong API mode, không đưa màn API vào mock shell không có context.

## Contract và bảo vệ dữ liệu

Nguồn: backend ref PR66 `f632797e`, CustomerDebtsController, CustomerDebtDtos, CustomerDebtService; SalesInvoiceDtos và GET SalesInvoicesController.

| BFF action | Backend |
|---|---|
| list | GET /api/customer-debts |
| statement | GET /api/customer-debts/{customerId}/statement |
| export | GET /api/customer-debts/export |
| invoice | GET /api/sales-invoices/{id} |

BFF chỉ nhận query đã định nghĩa, chặn query lặp/ngày sai, cố định origin/path, kiểm CUSTOMER_DEBTS và SALES_INVOICES riêng. Kiểm lại invoice ID, customer ID và phạm vi vùng từ dữ liệu trả về. Token backend ở server; không trả QR token hoặc lịch sử số điện thoại gửi tin không dùng trong màn này. Recheck phiên sau đọc; không cache. Quyết định yêu cầu mua số lồng + phân công được giữ nguyên.

## Kiểm tra và giới hạn thực tế

- 23 kiểm tra mục tiêu PASS: quyền View/Export, query, export/phiên, projection hóa đơn, đúng khách/vùng, checkbox qua nhiều trang, không lấy số hủy làm phát sinh, mở sổ inline/tab và menu.
- Browser API localhost:3002: Owner đăng nhập, mở menu và trang mới thành công. Bố cục **trạng thái lỗi** không tràn ở CSS 360/1024/1440 px theo DOM bounds. Chưa kiểm browser với bảng dữ liệu thật vì backend không có endpoint trong runtime hiện tại.
- API8082 trả 404 cho customer-debts và sales-invoices/{id}; đây là endpoint chưa triển khai trên runtime, không phải bằng chứng DB không có dữ liệu. BFF list/export chuyển trường hợp này thành dịch vụ chưa khả dụng, không hiển thị danh sách rỗng hoặc KPI 0 giả.
- Ảnh chẩn đoán `.hallmark/customer-debts-360-20261108.png`, `customer-debts-1440-20261108.png`; ảnh desktop có lỗi scale/crop của browser compositor, không dùng làm bằng chứng bảng đủ dữ liệu.
- Không nhận full E2E thật cho sổ/hóa đơn/xuất của module này. Fixture chỉ dùng trong test, không đưa vào UI sản phẩm.
- Chưa bổ sung màn chờ xác nhận tiền vì ref đang đọc chỉ có count, không có feed/action tương ứng trong contract đã nối.
- Không thay runtime backend/DB để tránh phá luồng số lồng; không migration/reset. Không commit/push/merge.

## File của batch

`src/features/customer-debts-api/{contracts,access,repository,list-query,invoice-dialog,screen}` cùng test; `src/server/workspace/customer-debts-http.ts` cùng test; BFF route và application page mới; bổ sung một link kiểm quyền trong api-workspace-shell. Tái sử dụng FilterWorkspace, FilterChecks, DataTable, OpenableTableRow, Dialog, VietnameseDateInput và CSS công nợ đã có.

## Chốt kiểm tra sau sửa

Lần chạy cuối hoàn tất rạng sáng 09/11/2026: `npm run lint`, `npm run typecheck`, `npm run build` đều exit 0; build 63 routes. 23 kiểm tra mục tiêu PASS. Sau kiểm tra browser đã bổ sung phân biệt upstream list 404 thành dịch vụ chưa khả dụng (503), có test BFF; chưa kiểm lại thông báo cuối này bằng browser. Không nhận PASS luồng dữ liệu thật khi backend còn thiếu endpoint.

# Landing, màn tải, hóa đơn bán, thanh toán của khách — 09/11/2026

Nhánh `experiment/wireframe-cycle-redesign-20261107`. Backend chuẩn: `omts-backend` develop `629e481d` (247 endpoint, đủ nhất; integration/meeting là tập con).
User duyệt: làm hàng loạt các màn còn API, không hỏi lại tới khi backend merge hết.

## Đã làm (code + test)

| Hạng mục | Vị trí | Ghi chú |
|---|---|---|
| Landing page tiếng Việt tại `/` | `src/features/landing/`, `src/app/(public)/page.tsx` | Không số liệu bịa; thẻ QR ghi "ví dụ minh họa". `/` không còn redirect `/login`. |
| Màn tải toàn trang | `src/components/feedback/boot-screen.tsx` | Thay chữ trơ lệch trái ở 6 chỗ (layout, login, recover, register, session shell, onboarding). Tôn trọng reduced-motion. |
| Lập hóa đơn bán (SALE-04) | `src/features/sales-invoices/`, `src/server/operations/sales-invoices-plan.ts` | Vòng câu hỏi 409 (giá, giảm giá, cho nợ, tiền dư), khóa chống lập trùng, bước kết thúc + QR + gửi lại. |
| Thanh toán của khách (DEBT-03) | `src/features/customer-payments/`, `src/server/operations/customer-payments-plan.ts` | Ghi nhận, trả lại tiền, chờ xác nhận (xác nhận/hủy gộp). 409: vượt công nợ, trùng mã giao dịch. |
| Tìm khách dùng chung | `src/features/customer-lookup/` | Dùng ở hóa đơn và thanh toán. |
| Sản lượng nuôi (HARVEST-03) | `src/features/harvest-yield/` | Lọc kỳ/vùng/gộp theo bè-vùng-chu kỳ, xuất Excel. Phân trang/sắp xếp ở trình duyệt (backend không có). |
| Truy xuất lô + sửa dữ liệu truy xuất (TRACE-01/02) | `src/features/lot-tracing/`, `lot-tracing-plan.ts`, `lot-tracing-upload-plan.ts` | Tìm, truy ngược/xuôi, công bố, xuất Excel; sửa thả giống/nhật ký/lô qua preview rồi xác nhận. Lưu nhật ký/lô là multipart PUT: đã nối trong `operation-http.ts`. Quyền: Publish/Correct -> PROVENANCE. |
| Thiết lập kỳ lương | `src/features/payroll-settings/`, `payroll-settings-plan.ts` | Chọn ngày bắt đầu kỳ (1-28), tự tạo bảng lương, xem trước 2 kỳ. Backend chỉ cho Chủ HTX. |
| Tổng quan nước theo vùng (WATER-03) | `src/features/water-overview/`, `water-overview-plan.ts` | Thay màn trống khi chưa chọn vùng. Ngưỡng "gần đây" tạm 24 giờ (`RECENT_MEASUREMENT_HOURS`). |

## Thiết kế BFF (cần reviewer chú ý)

- `readBackendResponse(..., invoiceQuestions)` chiếu câu hỏi xác nhận 409 thành `{ field, các số }`. Chỉ cho qua tên trường nằm trong danh sách (`confirmation-problem.ts`) và số/mã ngắn; **không** chuyển chuỗi lạ của backend ra giao diện (web tự viết câu chữ).
- Mô-đun mới đăng ký qua `operationAreas`/`operationModules`; quyền: thanh toán của khách là toàn HTX (không theo vùng), còn lại đi đường chung theo vùng.
- Idempotency: `deduplicationKey` giữ trong một lần ghi, đổi khi người dùng sửa biểu mẫu.

## API trên nhánh chưa merge (đã làm theo nhánh backend)

| Hạng mục | Nhánh backend | Ghi chú |
|---|---|---|
| Trang nguồn gốc công khai `/origin/{qrToken}` | `feature/OMTS-222-origin-page` | Render phía máy chủ, VI/EN, proxy ảnh `/origin/photo` (khóa+chữ ký+loại tệp+kích thước). Backend `PublicBaseUrl` phải trỏ tới web. |
| Thu hồi nguồn gốc | `feature/OMTS-222-trace-withdraw` | Trong màn Truy xuất lô: xem trước khách bị ảnh hưởng, lý do nội bộ bắt buộc, danh sách thông báo. Chỉ Chủ HTX. Không gửi lại POST. |
| VietQR trên hóa đơn | `feature/OMTS-224-vietqr-webhook` | Hộp thoại chờ chuyển khoản (QR vẽ SVG tự viết, không thêm thư viện), thăm dò 3s/5s/10s, đổi sang tiền mặt/ghi nợ, hủy. `operation-http.ts` nay nhận mã 202. Chưa quét thử bằng app ngân hàng thật. MSG-SALE-13/14 chưa có trong message-catalog. |

## Kiểm tra cuối

`tsc`, `npm run lint`, `npm run build` sạch; vitest 3214 đạt (lần chạy trước có 1 test employee-unlink trượt do quá tải song song, chạy riêng 40/40 đạt). Test `lookup-recovery` được cập nhật mock cho hợp đồng tổng quan nước (mảng).

## Chưa làm / thiếu API

- Danh sách hóa đơn bán (SALE-05): backend chỉ có `GET /api/sales-invoices/{id}`, chưa có endpoint liệt kê.
- Trả hàng bán (CLAIM-03), bảng lương và thanh toán lương (LABOR-10/11), báo cáo bán hàng (REPORT-01..03): chưa thấy API trong develop.
- Chưa thử luồng hóa đơn/thanh toán trên trình duyệt thật vì không có backend chạy cục bộ; chỉ có unit test + typecheck + lint + build.

## Câu hỏi mở

- `zoneStatus` của tổng quan nước hiện nguyên văn từ backend (cần map tiếng Việt nếu backend trả tiếng Anh); vùng ngừng dùng có tính vào "chưa đo gần đây" không?
- Trạng thái chu kỳ trong truy xuất giả định "Open"/"Closed".
- Staff với `SALES_INVOICES`/`CUSTOMER_PAYMENTS`: cần thử với tài khoản Quản lý vùng/Kế toán thật (mã chức năng và phạm vi).
- Tìm khách dùng resource `customers` (cần quyền `CUSTOMERS` View): kế toán có quyền này không?
- `/` thành landing: người dùng cũ vào `/login` để khôi phục phiên. Có muốn tự chuyển người đã đăng nhập sang `/dashboard` không (cần quyết định về đọc phiên ở trang công khai)?

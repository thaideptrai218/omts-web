# Local accounts and Manager → Accountant flow — 03/11/2026

## Kết quả

- Tài khoản local mock: `owner`, `manager`, `manager2`, `ketoan`, `trader`; mật khẩu chung `demo123`.
- Kế toán `ketoan` hoạt động, phạm vi Toàn hợp tác xã. UI và repository chặn Kế toán thứ hai; grant Kế toán chỉ nhận `Tất cả vùng`.
- Manager có menu **Phiếu nhập và yêu cầu thanh toán**, chỉ gửi trong vùng được gán.
- Kế toán có thêm **Thanh toán nhà cung cấp**, đọc yêu cầu mọi vùng và xác nhận thanh toán.
- Owner chỉ đọc danh sách/thông báo gửi và thanh toán; không có nút accept. Trader đăng nhập được, không có menu nội bộ.

## Browser evidence

Trên localhost:3000 đã chạy `manager` gửi `YC-TT-001`, Khu Đông, hóa đơn `HD-DEMO-001`, 150.000 đồng → `ketoan` thấy yêu cầu toàn HTX và đánh dấu đã thanh toán → `owner` thấy hai thông báo và trạng thái Đã thanh toán. `trader` đăng nhập thành công với nhãn Thương lái. Dữ liệu chỉ ở bộ nhớ local và không ghi backend.

Ảnh local ignored: `docs/learning/accounting-flow-local-20261103.png`.

## Verification

- Targeted: 41/41 rồi 30/30 tests PASS; thêm 2 test repository cho submit/payment/Owner notice và chặn cross-zone.
- Typecheck PASS.
- Lint và production build 41 routes PASS trên bản sao riêng, không ghi `.next` của dev server 3000.
- Dev server log không có lỗi runtime; các route receipt/payment trả 200.

## Giới hạn API

API mode vẫn dùng contract thật. Hành động `complete` hiện tạo công nợ và Web đã đổi copy thành gửi Kế toán. Backend chưa xác nhận event thông báo Owner/Kế toán theo luồng mới; Web không giả thông báo trong API mode. Xem quyết định `WEB_ACCOUNTING_REQUEST_FLOW_2026-11-03.md`.

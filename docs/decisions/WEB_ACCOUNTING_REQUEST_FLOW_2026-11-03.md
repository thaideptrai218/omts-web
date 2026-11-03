# Tài khoản và luồng phiếu gửi Kế toán — 03/11/2026

## Quyết định đã chốt

- Mỗi hợp tác xã chỉ có một Chủ HTX và một Kế toán đang hiệu lực.
- Kế toán có phạm vi toàn hợp tác xã, không cấp theo từng vùng.
- Quản lý vùng tạo phiếu nhập trong vùng được giao và gửi phiếu cho Kế toán thanh toán.
- Chủ HTX chỉ nhận thông báo để theo dõi; không có bước duyệt/chấp nhận phiếu trước khi Kế toán xử lý.

## Áp dụng ở Web local mock

- Tài khoản thử dùng username ngắn: `owner`, `manager`, `manager2`, `ketoan`, `trader`; mật khẩu chung `demo123`.
- Fixture Kế toán hoạt động và có grant `Tất cả vùng · Kế toán`.
- UI không cho chọn Kế toán khi HTX đã có một grant Kế toán hiệu lực. Repository kiểm tra lại quy tắc này và từ chối grant Kế toán theo một vùng.
- Owner là loại tài khoản riêng và form tạo tài khoản nội bộ không thể tạo thêm Owner.
- Local có màn `/operations/purchase-receipts` cho Manager gửi yêu cầu, Kế toán/Owner đọc; `/operations/supplier-payments` chỉ Kế toán thao tác. Gửi và thanh toán tạo thông báo chỉ đọc cho Owner; không có thao tác accept.
- Dữ liệu demo ở bộ nhớ của tab và reset khi reload/tab mới; không phải bằng chứng ghi backend.

## Contract API còn cần backend xác nhận/bổ sung

API phiếu nhập hiện dùng hành động `complete` để ghi nhận công nợ; Web diễn đạt hành động này là gửi cho Kế toán. Backend cần bảo đảm nguyên tử rằng:

1. chỉ Quản lý vùng có quyền phù hợp mới gửi được phiếu thuộc vùng được giao;
2. phiếu sau khi gửi xuất hiện trong hàng chờ/công nợ toàn HTX của Kế toán;
3. tạo thông báo cho Kế toán cần xử lý và thông báo chỉ đọc cho Owner;
4. không tạo trạng thái chờ Owner duyệt và không có endpoint Owner accept;
5. idempotency, xung đột phiên bản, audit actor/thời điểm và mã lỗi được giữ khi gửi hoặc thanh toán chưa rõ kết quả.

Web không tự tạo thông báo giả trong API mode. Cho tới khi backend phát hành event/notification contract, tester chỉ có thể kiểm việc hoàn thành phiếu tạo công nợ và Kế toán thanh toán theo API hiện tại; thông báo Owner là dependency đang chờ.

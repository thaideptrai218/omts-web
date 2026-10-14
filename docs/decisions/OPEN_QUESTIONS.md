# OMTS Web — câu hỏi mở cần quyết định

Tài liệu này ghi lại các điểm chưa thống nhất giữa SRS, Jira, Figma hoặc backend contract. Không triển khai một phương án như yêu cầu đã xác nhận cho tới khi trạng thái được chuyển từ `Open` sang `Decided` và có người xác nhận.

## WEB-AUTH-01 — Có cho phép đăng nhập bằng số điện thoại chưa xác minh không?

- **Trạng thái:** Decided — Phương án B
- **Ngày xác nhận:** 14/10/2026
- **Người xác nhận:** Duy Thái
- **Phạm vi:** UC02 / SCR-03 / BR-34
- **Ảnh hưởng code:** label và helper text của identifier; login request/response contract; mock service; validation; first-login tests; phone-verification gate.

### Bằng chứng đang mâu thuẫn

1. UC02 Normal Flow ghi identifier là `username, phone number or verified email`. Cách viết này chỉ yêu cầu email phải verified.
2. UC02 branch 3a cho phép Trader/Staff đăng nhập khi chưa có verified phone, sau đó chặn mọi chức năng khác và bắt thực hiện UC08.
3. Entity Account mô tả email chỉ dùng đăng nhập sau khi verified; số điện thoại nội bộ có thể do Cooperative Owner nhập và được người dùng xác minh ở lần đăng nhập đầu.
4. SCR-03 lại ghi `Username, verified phone number or email`, có thể được hiểu rằng số điện thoại cũng phải verified trước khi dùng làm identifier.

### Phương án A — Cho phép số điện thoại chưa verified làm identifier

Backend tìm account bằng username, phone number hoặc verified email. Sau khi password đúng, nếu Trader/Staff chưa verified phone thì session chỉ được dùng cho gate UC08; các chức năng khác chưa mở.

Ưu điểm: khớp UC02 Normal Flow và hỗ trợ trực tiếp first-login branch 3a. Việc biết số điện thoại không đủ đăng nhập vì người dùng vẫn cần password.

### Phương án B — Chỉ số điện thoại verified mới dùng để đăng nhập

Staff có số điện thoại chưa verified phải đăng nhập lần đầu bằng username và temporary password, sau đó xác minh phone. Số điện thoại chỉ trở thành identifier sau khi UC08 thành công.

Ưu điểm: khớp câu chữ hiện tại của SCR-03. Nhược điểm: UI/hướng dẫn first login phải nói rõ người dùng bắt buộc dùng username trước khi phone được verified.

### Khuyến nghị ban đầu của frontend

Ưu tiên **Phương án A** vì khớp Normal Flow và branch 3a rõ hơn. Dù chọn phương án nào, backend phải trả về next action rõ ràng sau khi credentials hợp lệ, ví dụ `CHANGE_TEMP_PASSWORD`, `VERIFY_PHONE` hoặc `ENTER_APP`; frontend không nên tự suy diễn từ tên role.

### Quyết định đã xác nhận

Chỉ `username`, số điện thoại đã xác minh hoặc email đã xác minh được dùng làm identifier đăng nhập.

Staff ở lần đăng nhập đầu dùng `username` và temporary password. Sau khi credentials hợp lệ, người dùng vẫn bị chặn ở gate xác minh số điện thoại theo UC02 branch 3a/UC08; chưa được mở các chức năng nghiệp vụ cho tới khi xác minh thành công.

Hệ quả frontend:

- Label/helper text phải nói rõ số điện thoại và email cần được xác minh.
- Không gửi một số điện thoại chưa xác minh như identifier đăng nhập trong mock/API contract.
- First-login test phải dùng username, sau đó đi tới phone-verification gate.
- Nếu backend hiện thực khác quyết định này, cần đưa chênh lệch trở lại nhóm/SRS trước khi đổi UI.

## WEB-AUTH-02 — Contract biểu diễn post-login gate

- **Trạng thái:** Deferred — chưa chặn route/layout foundation; phải xác nhận trước khi tích hợp login API thật.
- **Vấn đề:** UC02 yêu cầu ba kết quả sau khi credentials hợp lệ: buộc đổi temporary password, buộc xác minh phone, hoặc vào ứng dụng với permission scope.
- **Không được tự chốt:** tên field, token được phát trước hay sau gate, route đích, và payload `/me/permissions`.

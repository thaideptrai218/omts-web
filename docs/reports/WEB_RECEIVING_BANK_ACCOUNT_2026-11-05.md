# Tài khoản ngân hàng nhận tiền

- Route: `/cooperative/receiving-bank-account`; menu Owner “Ngân hàng nhận tiền”.
- API develop `f8e42428`: `GET /api/banks`, `GET/PUT /api/cooperative/receiving-bank-account`.
- BFF giữ bearer phía server, kiểm Owner, CSRF khi ghi, giới hạn payload, kiểm schema và đối chiếu phiên sau response.
- Luồng: điền form → gửi `confirmAccount=false` → backend kiểm dịch vụ → 409 `MSG-DEBT-01` → người dùng xác nhận → gửi chính payload đã kiểm với `confirmAccount=true`. Không tự gửi lại khi kết quả chưa rõ.
- Hiển thị ngân hàng/số tài khoản/chủ tài khoản/thời điểm chấp nhận từ backend. Form dùng danh sách ngân hàng thật; không tạo QR hoặc số liệu giả.
- Khi lỗi chưa rõ kết quả/xung đột: giữ nháp, khóa ghi, đọc tài khoản hiện tại để đối chiếu; bỏ nháp chỉ sau xác nhận.
- `npx tsc --noEmit` đạt. Không chạy test theo yêu cầu người dùng; chưa xác nhận API live hoặc dịch vụ chấp nhận tài khoản đã cấu hình trên runtime.
- Chưa đồng bộ sản phẩm/yêu cầu mua kg trong đợt này. Không commit/push.

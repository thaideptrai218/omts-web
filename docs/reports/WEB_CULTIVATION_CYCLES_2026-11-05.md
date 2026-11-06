# Chu kỳ nuôi — đợt triển khai đầu tiên

- Route API: `/operations/cultivation-cycles`, menu Nuôi trồng theo quyền `CULTIVATION_CYCLES` và vùng hiệu lực.
- Danh sách bè theo vùng, chu kỳ hiện tại/gần nhất, ngày bắt đầu/kết thúc và số làn.
- Chi tiết kế hoạch, số ngày nuôi, đánh giá và lịch sử chu kỳ của bè.
- Nối mở chu kỳ, sửa kế hoạch và hủy chu kỳ mở nhầm theo cờ `canStart/canEdit/canCancel`, quyền Create/Edit/Delete và rowVersion.
- Tái sử dụng BFF/session/CSRF, repository và xác nhận/bảo vệ nháp hiện có. Lỗi ghi chưa rõ kết quả khóa thao tác, không tự gửi lại.
- Contract đọc từ `origin/feature/OMTS-220-cycles`; chưa merge nhánh này vào backend develop hoặc đổi runtime/database.
- Chưa có thao tác kết thúc chu kỳ trong controller đã đọc: không tự tạo endpoint hoặc nút chuyển trạng thái.
- TypeScript đạt. Theo yêu cầu tiết kiệm thời gian trước đó, chưa chạy test sâu/browser/live API; chưa xác nhận tester CRUD thành công.
- Tiếp theo: thả giống, sử dụng vật tư, thu hoạch. Kiểm tra contract thực tế trước từng nhóm; tên mục trong backlog chỉ là phạm vi dự kiến, không chứng minh backend có đủ mọi thao tác.

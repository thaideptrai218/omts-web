# OMTS-175 — C4.3 Notification preference mock repository

## Hành vi đã mô phỏng

Mock repository nhận `initialSettings` từ caller, clone dữ liệu khi load/save và không lưu một catalog được xem như chính thức. Nó hỗ trợ:

- lưu cell editable;
- từ chối thay đổi cell bắt buộc bằng MSG23;
- từ chối bật channel không đủ điều kiện bằng MSG21;
- bỏ qua yêu cầu bật push đã bị thiết bị từ chối, vẫn lưu cell hợp lệ khác và trả warning MSG22;
- trả MSG19 khi session không còn active.

Mock preflight tất cả selection trước khi thay đổi state để tránh lỗi nửa lưu, nửa thất bại. Duplicate hoặc key không tồn tại được ném thành lỗi contract của frontend fixture/caller; SRS không có business message phù hợp để che lỗi lập trình này.

## Lỗi thực tế và cách sửa

`npm run typecheck` báo TS2322 vì reason type gộp `{ code: "MSG22" | "MSG23" }`. Sau nhánh kiểm tra MSG22, TypeScript không thể chứng minh object còn lại là đúng `{ code: "MSG23" }` mà save result yêu cầu. Type được sửa thành hai union member độc lập. Sau sửa: 3 targeted test files với 21 test cases, typecheck, lint và `git diff --check` đều xanh.

# TASKS

Làm **từng bước một**. Mỗi bước nhỏ, kiểm tra được, xong mới sang bước kế. Trước mỗi bước: giải thích nó là gì, vì sao cần, dữ liệu/điều khiển chạy ra sao.

Ký hiệu: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. Chép kết quả vào [PROGRESS.md](PROGRESS.md).

## Quy trình mỗi task
1. Đọc ngữ cảnh: PROJECT_CONTEXT, SRS/quyết định liên quan.
2. Nếu đụng quy tắc nghiệp vụ hoặc bảo mật → hỏi người dùng (xem RULES).
3. Viết code nhỏ nhất đủ chạy; có test.
4. `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
5. Ghi kết quả vào PROGRESS; commit gọn theo conventional commits.

## Backlog (chờ backend / quyết định — cập nhật khi có thay đổi)
- [ ] Luồng thu hoạch → bàn giao → bán hàng/thanh toán (chờ backend)
- [ ] Kích hoạt liên hệ cho tài khoản Staff mới (chờ backend)
- [ ] Tạo tài khoản mới và cấp grant/sửa vai trò theo vai trò cố định (chờ căn chỉnh backend/SRS)
- [ ] Làm mới token trực tiếp (đang tắt)
- [ ] Trang truy xuất QR công khai hoàn chỉnh
- [ ] Nhận chuyển khoản ngân hàng của HTX (chờ quyết định BA/backend)
- [ ] Admin: toàn bộ tài khoản, khóa, audit; Manager sửa bè/vật tư theo vùng (cần contract/quyền)
- [ ] Triển khai Vercel với API thật (cần backend HTTPS ổn định + Redis có TLS/xác thực)

## Mẫu task mới
```
- [ ] <động từ + đối tượng>  (Jira OMTS-<n>)
      Tệp: <đường dẫn>   Tiêu chí xong: <kiểm chứng được>
```

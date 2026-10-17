# OMTS-196 — D1.2 One-time Owner credential

## Thành phần đã tạo

Message catalog có MSG03 cho duplicate provisioning và MSG55 cho verification failure. Cả hai có test format và MSG03 nhận `object_name` thay vì hard-code một đối tượng duy nhất.

`OneTimeOwnerCredentialDialog` hiển thị account identifier cùng temporary password do backend/repository trả về. Dialog không thể đóng bằng Escape, backdrop hoặc nút X; người quản trị phải dùng hành động “Tôi đã bàn giao thông tin”. Temporary password không được sinh, ghi log, đưa vào URL hoặc lưu localStorage ở component.

Nút copy nhận initial focus, có `aria-live` báo thành công và hướng dẫn chọn thủ công nếu Clipboard API thất bại. Nội dung nhắc rõ password chỉ hiện một lần, hiệu lực 24 giờ và hết hạn phải dùng UC74 thay vì tạo lại HTX.

## Lỗi thực tế

Typecheck ban đầu báo TS2322 vì shared `Button` không expose `ref`. Dialog đã có focus marker `data-dialog-initial-focus`, nên component chuyển sang cơ chế sẵn có này. Không mở rộng API shared Button khi không cần thiết. Sau sửa, test message, typecheck, lint và diff check đều xanh.

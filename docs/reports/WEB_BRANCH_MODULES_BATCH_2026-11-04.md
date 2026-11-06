# Nhật ký chăm sóc, chứng nhận HTX và đối chiếu công nợ

## Chức năng đã nối

| Màn | Đường vào | Contract backend |
|---|---|---|
| Nhật ký chăm sóc | Chu kỳ nuôi → Lịch sử và tiến độ → Nhật ký chăm sóc | `origin/feature/OMTS-220-logs`, `CultivationLogsController` |
| Chứng nhận HTX | `/cooperative/certifications` | `origin/feature/OMTS-217-cooperative-profile`, `CooperativeCertificationsController` |
| Đối chiếu công nợ | `/operations/supplier-debts` | `origin/feature/OMTS-218-payments-debts`, `SupplierDebtsController` |

- Nhật ký: đọc danh sách và ảnh, ghi mới 1–10 ảnh JPEG/PNG tối đa 10 MB/ảnh, sửa ngày/nội dung/ảnh giữ lại và lý do, gỡ có lý do. Tạo theo chu kỳ, sửa/gỡ theo ID nhật ký. Backend kiểm vùng/người ghi và `canCorrect`. Theo contract logs hiện tại, sửa không có điều kiện rowVersion; không tự bổ sung cơ chế phiên bản khác backend.
- Chứng nhận: Owner xem danh sách và trạng thái còn hiệu lực/sắp hết hạn/hết hạn; thêm với tệp bắt buộc, sửa có thể thay tệp; xóa có xác nhận, kèm rowVersion. PDF/JPEG/PNG tối đa 10 MB. Tên/ngày hết hạn bắt buộc; số chứng nhận và đơn vị cấp tùy chọn.
- Công nợ: Owner hoặc tài khoản có `SUPPLIER_PAYMENTS/View` xem danh sách nợ, tiền ứng trước và tuổi nợ; mở sổ đối chiếu theo kỳ với đầu kỳ, từng phát sinh và cuối kỳ. Chưa nối export, chưa đồng bộ toàn bộ màn thanh toán cũ sang mô hình payment v2.
- Các BFF kiểm phiên, quyền, schema và bản ghi trả về; mutation kiểm CSRF, upload có giới hạn. Lỗi giữ nháp, kết quả không chắc chắn khóa gửi lại và yêu cầu đối chiếu, không tự replay.

## Môi trường chạy

Các endpoint này chưa nằm trên backend develop tại lần rà soát gần nhất. Frontend nối contract của các branch trên; thêm màn Web không tự triển khai hoặc hợp nhất các branch backend. Một backend chỉ chạy branch logs sẽ không đồng thời có toàn bộ API payments v2; tester cần bản backend tích hợp các module tương ứng.

## Kiểm tra và phần còn lại

Lint, typecheck và production build đạt (50 trang). Chưa chạy browser hoặc ghi dữ liệu lên backend thật trong đợt này theo yêu cầu kiểm tra gọn.

Tiếp theo: đồng bộ phiếu nhập/thanh toán/trả hàng v2; bè v2 và giấy tờ vùng v2; mô hình đo nước mới. Không tính các phần này là hoàn thành chỉ vì đã có source branch.

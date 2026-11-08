# Tệp hóa đơn đang chờ và chuyển trạng thái phiếu

30/10/2026. Trạng thái: người dùng đã duyệt phương án1: **Yêu cầu tải lên hoặc bỏ chọn tệp trước khi hoàn thành/hủy**. Phương án2 bên dưới chỉ là lựa chọn đã không được chọn.

Đã tái hiện QA032: chọn hóa đơn, sửa ghi chú, Lưu nháp thành công làm editor remount và mất tệp chưa upload. Sửa giữ tệp qua Save nháp là khắc phục mất dữ liệu giao diện, không tự upload hoặc thay validation/API. Tệp chỉ ở bộ nhớ trang và gắn đúng phiếu; đóng/bỏ nháp có xác nhận sẽ loại chúng. Reload/đóng browser không được coi là đã lưu tệp trên server.

API upload hóa đơn chỉ hỗ trợ phiếu nháp, nên cần quyết định rõ khi còn tệp đã chọn mà chưa upload:

1. Đề xuất: trước hoàn thành/hủy, người dùng phải tải tệp lên hoặc chủ động Bỏ chọn tệp. Hiện lý do cạnh các nút, không tự upload. Có thể tiếp tục Lưu nháp và giữ tệp.
2. Thay thế: cho chuyển trạng thái sau một dialog xác nhận rõ sẽ bỏ các tệp chưa tải lên. Quay lại giữ tệp và phiếu; Đồng ý bỏ tệp rồi gửi đúng lệnh chuyển trạng thái một lần.

Không gộp tự động upload với hoàn thành/hủy vì hai endpoint riêng, có thể thành công từng phần hoặc không rõ kết quả. Không đổi contract, quyền, thời gian phiên, conflict/unknown hoặc auto-retry. AGENTS.md yêu cầu xác nhận trước thay bước nghiệp vụ/validation/trạng thái; xác nhận đã nhận trước khi thêm guard chuyển trạng thái. Áp dụng cho Lưu và hoàn thành, Hoàn thành phiếu đã lưu và Hủy, kể cả form hủy đã mở trước khi chọn tệp.

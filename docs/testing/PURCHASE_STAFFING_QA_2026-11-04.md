# QA Web — nhân lực yêu cầu mua

Luồng mới chỉ ở chế độ API. Local3000/Vercel mock không có màn giả cho các endpoint này. Chỉ chạy các ca dưới sau khi backend có feature `b5a1d73` đã được đồng bộ với schema/catalog hiện dùng và môi trường API/Redis đã sẵn sàng. Chưa áp migration vào DB QA trong đợt này.

## Luồng chính

1. Owner chuẩn bị sản phẩm đang nhận yêu cầu mua, nếu danh mục chưa có. Trader vào Kinh doanh → Yêu cầu mua hàng, gửi yêu cầu và chọn ngày nhận tương lai.
2. Owner mở yêu cầu → Lập kế hoạch và mời nhân viên. Nhập số lồng không vượt yêu cầu, ngày làm không quá hạn, ngày nhận không trước ngày làm, năng suất nguyên dương và chọn nhân viên khả dụng. Xem số người cần rồi xác nhận gửi.
3. Yêu cầu chuyển sang Chờ nhân viên xác nhận. Owner chưa đủ người đồng ý thì không chọn Chấp nhận được. Trader thấy tiến độ tổng, không thấy tên/lý do riêng của nhân viên.
4. Nhân viên được mời đăng nhập bằng chính tài khoản gắn hồ sơ, vào Nhân sự & phân quyền → Công việc và nghỉ phép của tôi → Lời mời ca theo yêu cầu mua. Chọn khoảng ngày chứa ngày làm → Phản hồi ca → Đồng ý → xác nhận.
5. Owner tải lại yêu cầu mua và mở lại chi tiết. Khi đủ người, Chấp nhận dùng đúng số lồng/ngày nhận trong kế hoạch. Chọn điều kiện trả sau nếu cần, ghi chú rồi lưu phản hồi/xác nhận.
6. Trader tải lại yêu cầu và kiểm tra kết quả. Việc chấp nhận không tự tạo thu hoạch, cân hàng, hóa đơn hoặc thanh toán.

Ví dụ dữ liệu QA: yêu cầu 2 lồng, năng suất 2 lồng/người/ngày → cần 1 người đồng ý. Đây là đầu vào ca kiểm thử, không phải năng suất mặc định của sản phẩm.

## Ca biên

- Từ chối ca thiếu lý do bị chặn; có lý do gửi được. Phản hồi đã gửi không có nút sửa.
- Owner mời thêm người: số lồng/ngày/năng suất/ghi chú đã gửi chỉ đọc; người đã mời không chọn lại được. Người không khả dụng hiển thị lý do và không chọn được.
- Chưa đủ người, ca quá hạn hoặc request đã đóng: không nhận đơn. Backend vẫn quyết định cuối nếu trạng thái thay đổi đồng thời.
- Owner từ chối đơn phải có lý do. Trader hủy lúc Chờ nhân viên xác nhận; tải lại để kiểm trạng thái cuối. Backend giữ lịch sử và giải phóng ngày đã giữ.
- Hai tab/nhân viên cùng phản hồi làm đổi parent rowVersion: Owner nhận MSG06 phải đối chiếu rồi lưu lại thủ công. Bản nháp không bị tự gửi lại.
- Mất mạng/5xx sau POST: giữ nháp và khóa gửi lại; đọc dữ liệu mới không tự mở khóa kết quả chưa rõ. Nếu POST mời đã xác nhận thành công nhưng GET cha lỗi, dùng Tải yêu cầu sau khi gửi.
- Staff/Trader không gọi được API danh sách lời mời của Owner. Staff không nhận employeeId/accountId do browser chỉ định.

Đối chiếu [quyết định](../decisions/WEB_PURCHASE_STAFFING_2026-11-04.md) và [báo cáo runtime](../reports/WEB_BACKEND_UPDATE_STAFFING_2026-11-04.md). Chưa đánh dấu các ca này là API/browser E2E PASS khi backend mới chưa chạy.

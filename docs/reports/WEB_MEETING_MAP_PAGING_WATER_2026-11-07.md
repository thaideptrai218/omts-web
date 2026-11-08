# Ghi chú họp: vùng nuôi rộng, bản đồ, kế hoạch và phép đo

## Đã thực hiện trên nhánh thử nghiệm
- Chu kỳ nuôi: chia 10/20/50 bè/trang, Trước/Sau; đổi bộ lọc hoặc kích thước trang về trang1, đóng hồ sơ trước khi chuyển trang.
- Vùng nuôi: VietMap hiển thị ngay trên danh sách, toàn bộ vùng được tài khoản cấp quyền, không lọc theo vùng đang xem trong directory. Hồ sơ vùng/bè cũng hiển thị bản đồ tổng thể ngay.
- Kế hoạch: thêm tình hình thực hiện từ API seeding list: số làn, đánh dấu hoàn tất, số lần ghi nhận, lượng giống từng lô. Không tự chia số lượng theo làn hoặc cộng các đơn vị khác nhau.
- Web phép đo: bỏ tạo mới; mở chi tiết ở chế độ chỉ đọc (không xác nhận/hiệu chỉnh/hủy/nhận dạng lại). Giữ lịch sử, biểu đồ, ảnh, xuất và quản lý ngưỡng theo quyền cũ. Ghi nhận trên điện thoại theo yêu cầu họp. Backend quyền không đổi.

## Còn cần chốt/bổ sung
- Backend API chu kỳ hiện trả mảng tất cả bè theo vùng. Phân trang Web là client-side, chưa giảm payload: cần server pagination/search/filter cho khu vực lớn. Bản đồ cần viewport clustering hoặc tile/query bbox khi mật độ vị trí lớn; chưa tuyên bố hiệu năng hàng nghìn điểm.
- Người dùng cần chốt kế hoạch: nhắc/cảnh báo chênh lệch hay chặn vượt kế hoạch. Chưa tạo ràng buộc nghiệp vụ hoặc tỷ lệ thực hiện sản lượng khi thiếu cơ sở tổng hợp.
- Dashboard Owner tổng hợp đã được yêu cầu, sẽ làm ở đợt riêng; không coi module này là dashboard đã hoàn thiện.

## Kiểm tra
Lint/typecheck/build đạt. Browser Owner API thật: Ngọc Vừng10 bè; B1-01 thực tế3/3làn,2lần,5000con; màn nước không có nút ghi phép đo. Không ghi dữ liệu nghiệp vụ.
Không commit/push/merge.

## Người dùng làm rõ kế hoạch
Cần lập kế hoạch công việc rồi theo dõi thực hiện, không yêu cầu cảnh báo/chặn vượt mục tiêu. Chưa thấy endpoint kế hoạch công việc chu kỳ trong source backend runtime meeting hiện tại. Đã thêm bản mẫu UI (state trong component, không lưu) dành cho actor có quyền sửa chu kỳ: nội dung/ngày dự kiến/tiến độ/ghi chú, thêm và bỏ việc. Không gắn với API phân công hoặc cập nhật tiến độ nuôi thật. Cần backend/PM chốt entity kế hoạch, công việc, liên hệ chu kỳ và quyền cập nhật trước khi nối lưu thật. Không kết luận đã rà soát mọi remote branch ở đợt này.

## Đợt tiếp theo: chọn vị trí và tổng quan Owner
- Callback chọn marker mở phần chi tiết bên dưới bản đồ dùng API detail hiện có; danh sách vùng cho phép chọn tương tự, bè trong vùng bấm xem tiếp. Không render bản đồ thứ hai trong editor hồ sơ.
- Owner dashboard thay danh mục lối tắt bằng bản mẫu báo cáo theo wireframe: doanh thu/diễn biến, công nợ, cảnh báo nước, việc chờ xử lý và lô đang mở. Có nhãn toàn bộ dữ liệu minh họa; lọc vùng/kỳ chỉ tác động fixture, không pha dữ liệu API thật.
- Công nợ/việc chờ xử lý giữ phạm vi toàn HTX, doanh thu/lô/cảnh báo theo phạm vi mẫu được chọn. Không coi dashboard đã nối API hoặc endpoint báo cáo đã có. Link mở màn nghiệp vụ thật, không giả thao tác duyệt.

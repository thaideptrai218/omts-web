# Loại công việc, đơn giá và đọc nhật ký thăm bè

## Loại công việc và đơn giá

- Route `/operations/job-types` trong nhóm Nhân sự & phân quyền, theo quyền `PAY_RULES` và projection hiện hành.
- Danh sách/tìm kiếm/lọc trạng thái, phân trang 10/20/50/100 dòng.
- Thêm loại việc và đơn giá đầu tiên, đổi tên, thêm hoặc thay đơn giá theo ngày hiệu lực, ngừng/khôi phục.
- Lịch sử đơn giá gồm mức hiện tại, mức trước đây và mức tương lai; không suy diễn tiền công thực tế.
- Xác nhận thay mức đã có cùng ngày; rowVersion và khóa gửi lại khi xung đột/ghi chưa rõ kết quả. Có đọc hồ sơ để đối chiếu và giữ nháp.
- Validation backend tham chiếu: tên tối đa 100 ký tự; đơn giá nguyên dương tối đa 999.999.999 đồng/giờ. Backend tiếp tục kiểm tên unique và kỳ công đã khóa.
- Lối vào cũ trong màn phân công nay dẫn sang màn này, thay cho tạo tên công việc qua endpoint workforce cũ.
- Contract: `origin/feature/OMTS-227-job-types`, `JobTypesController`, `JobTypeDtos`, `JobTypeFields`.

## Nhật ký thăm bè

- Trong hồ sơ chu kỳ → tiến trình làn theo ngày, đọc nhật ký của chu kỳ ứng với ngày đã chọn.
- Hiển thị ngày thăm, nội dung, người ghi, giờ ghi và liên kết ảnh.
- Kiểm quyền `CULTIVATION_LOGS View` riêng, không suy quyền từ chu kỳ.
- Ảnh đi qua BFF đọc lại hồ sơ nhật ký rồi proxy file cùng backend origin.
- Đây là nhật ký thăm bè; không thay thế màn nhật ký thao tác/audit hệ thống.
- Chưa nối ghi/sửa/gỡ nhật ký. Contract corrections của module này không nhận rowVersion (last save wins); cần giữ đúng khác biệt này trong đợt tiếp theo, không giả lập khóa phiên bản ở frontend.
- Contract: `origin/feature/OMTS-220-logs`, `CultivationLogsController`, `CultivationLogDtos`.

## Bản đồ đã đối chiếu

- Đọc `omts-mobile`, ref `origin/feature/acs-zalo-linking`, `src/features/farming/components/raft-map.tsx`.
- Mobile dùng `@vietmap/vietmap-gl-js`, style VietMap hm, tọa độ `[longitude, latitude]`, chỉ đặt marker khi tọa độ hữu hạn/hợp lệ; không biến null thành 0.
- Marker vùng/bè mở hồ sơ, fitBounds, resize và thông báo dịch vụ lỗi/quota. Key qua cấu hình public dành cho map, cần giới hạn domain ở provider.
- Chưa cài SDK hoặc thêm bản đồ Web trong đợt này. Không sao chép key Mobile vào repo.

## Kiểm tra

- TypeScript và lint phần mới đạt; chưa browser/live API, chưa xác nhận CRUD trên runtime integration.
- Giữ nguyên thay đổi local, không sửa backend/database; chưa commit/push/merge.

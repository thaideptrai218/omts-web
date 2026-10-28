# Bè nuôi và sơ đồ làn — micro-task ngày28/10/2026

Mục tiêu buổi review: từ danh sách vùng đi tới bè, xem vị trí/kích thước, sơ đồ A/B, tình trạng từng đoạn theo ngày và sự kiện nguồn. Dữ liệu qua service/repository mock, không gọi API thật. Không suy số kg từ màu hoặc chiều dài. Đây là lát tiếp theo của [kế hoạch theo SRS/vai trò](WEB_SRS_ROLE_IMPLEMENTATION_PLAN.md).

## Nguồn đã đối chiếu

- Report3Finnal UC18, UC76/77, SCR-12/60/61 và BR-01/02/03/25/27/28.
- Jira OMTS-210 và cha OMTS-119; OMTS-209 mô tả mô hình vật tư mới. Đã đọc yêu cầu, không dùng trạng thái Done thay bằng chứng code.
- Backend local develop953f597: RaftsController, RaftService, RaftLayout, RaftConditionService, LaneConditionRules, DemoRaftStep. Không pull/chạy backend trong đợt này.
- Chiến lược màn13/10 ở repo tài liệu cũ: SCR-12 có Web quản lý và mobile companion. Chỉ đọc tài liệu, không lấy lại code prototype.

## Hai quyết định đã được người dùng chốt

RAFT-DEC-01: Người dùng chọn theo backend mới: lưu bè/sơ đồ trước; chi phí lấy từ phiếu nhập INP-03 sau. Chưa có số liệu thì null, không hiển thị0. Bỏ phiếu vật tư tạo bè/thay thế trong flow cũ; không tự thêm module nhập vật tư trong lát này.

RAFT-DEC-02: Người dùng chọn chỉ Owner ghi; người có quyền xem bè đọc trong vùng/phạm vi được cấp. Danh mục quyền bè của các vai trò cố định chỉ có View; repository kiểm Owner riêng cho mọi mutation.

## Tác vụ và điều kiện kiểm

| Mã | Làm gì | Kiểm tra |
| --- | --- | --- |
| RF1 | Domain bè/layout/cycle/sự kiện, phép chia đoạn theo mốc A | Các đoạn phủ0…length, nguồn đúng; Planned là overlay, không biến thành thu hoạch |
| RF2 | Repository/service đọc theo quyền và vùng; dữ liệu mẫu có ngày, layout cũ, cycle đóng/mở | Manager không đọc chéo vùng; OWN chỉ bản ghi do mình tạo; grant hết hạn/khóa bị chặn; snapshot không sửa được store |
| RF3 | Danh sách theo vùng/trạng thái/tìm mã, popup hồ sơ | Loading/empty/error/retry/forbidden; tên vùng lấy nguồn chung, không hard-code |
| RF4 | Sơ đồ responsive, bộ chọn ngày/chu kỳ, lịch sử layout và popup nguồn đoạn | Mỗi đoạn là nút có tên/chiều dài/trạng thái, dùng bàn phím; ngày tiếng Việt, không có kg tự suy |
| RF5 | Ghép menu/capability và liên kết từ vùng | Dựa RAFT View và zone ID; ghi chỉ Owner theo RAFT-DEC-02 |
| RF6 | Ghép blocker vùng với bè thực có trong mock | Vùng còn bè In Use không ngừng được; không dùng mảng mã bè giả tách nguồn |
| RF7a | Form thông tin và làn | Tọa độ/vị trí, kích thước, mã; mã duy nhất trong vùng; số làn1…N, mốcA/B và chiều dài hợp lệ |
| RF7b | Lưu sơ đồ có phiên bản | Chu kỳ mở khóa cấu trúc, vẫn sửa metadata; giữ layout cũ; không xóa làn có dữ liệu lịch sử |
| RF7c | Ngừng/khôi phục | Không ngừng khi có chu kỳ mở; không tạo/khôi phục ở vùng ngừng; recheck version/Owner tại publish |
| RF7d | Ảnh bè | JPEG/PNG10MiB; file/header hợp lệ; thay ảnh riêng, lỗi không làm mất ảnh hoặc metadata cũ |
| RF7e | Vòng đời form | Giữ nháp khi lỗi/trùng/version; xác nhận bỏ nháp, chống double-submit/late response/submit sau unmount |
| RF8 | Review và bàn giao | Hồi quy race load/date/account, permission, interval; lint/typecheck/build/HTTP; kiểm360/1024; ghi báo cáo/bài học local |

RF7 được triển khai sau khi nhận hai câu trả lời trên. Các nghiệp vụ phiếu nhập, chu kỳ/gieo/thu hoạch vẫn là lát sau; ở đây đọc dữ liệu mẫu nguồn để kiểm sơ đồ, không coi chúng là flow ghi đã hoàn thành. Mô tả vị trí tùy chọn, tọa độ bắt buộc theo SaveRaftRequest; tọa độ là vị trí bắt buộc, không yêu cầu ghi lại cùng thông tin bằng chữ.

## Thiết kế

Giữ token xanh biển, font, shell và popup đã chốt. Danh sách ưu tiên dạng bảng dễ so sánh; trên điện thoại dùng các dòng thông tin xuống hàng. Điểm chính là sơ đồ làn hiển thị dữ liệu thật của dataset mock, không phải ảnh minh họa trang trí. Hallmark dùng ở bước rà soát app screen; không thay palette, chạy lại theme hay cắt thông tin nghiệp vụ để đạt quy tắc landing page.

## Trạng thái kiểm cuối

RF1–RF8 đã triển khai trong phạm vi mock của lát này; [báo cáo](reports/WEB_RAFT_MANAGEMENT_REVIEW_2026-10-28.md) ghi test, lỗi thực tế đã sửa, browser và giới hạn. Full2.440 pass/31 Redis skip; lint/typecheck/build20/20/28 HTTP đạt. Chưa nối API bè, phiếu nhập hoặc form ghi sự kiện chu kỳ. Không dùng trạng thái này để đánh Jira Done hay coi mọi luồng SRS đã hoàn thành.

# Vai trò cố định — quyết định của Duy Thái ngày 27/10/2026

## Đã xác nhận trực tiếp

Danh sách vai trò có thể gán theo vùng chỉ gồm **Quản lý vùng, Kế toán, Nhân viên**. Không cho Owner tạo, sao chép hoặc đổi tên vai trò. Chủ HTX, System Administrator và Thương lái vẫn là loại tài khoản riêng, không đưa vào picker vai trò vùng.

Owner được sửa quyền, ngừng sử dụng và khôi phục vai trò. Ngừng dùng vẫn phải chặn khi có grant hiệu lực. Khôi phục vai trò không khôi phục grant đã thu hồi. Tên vai trò cố định; lịch sử grant không bị xóa.

Vai trò Nhân viên mới chưa có quyền nghiệp vụ nào. Người dùng vẫn có hồ sơ/bảo mật cá nhân theo cơ chế hiện có; Owner cấu hình quyền nghiệp vụ trước khi phân công. Không tự cấp quyền đọc nhân sự, tài chính hoặc vùng nuôi cho role mới.

## Mâu thuẫn với nguồn hiện hành

SRS `Report3Finnal.md` UC12 (khoảng dòng2379) và Jira [OMTS-201, ACS-10](https://welterial.atlassian.net/browse/OMTS-201) đang có Add/Copy role. Backend local `48ae1e0` cũng có `POST api/roles`, copy và PUT tên; DefaultRoles chỉ seed Zone Manager và Accountant. Đây là quyết định thay đổi yêu cầu, không phải lỗi frontend đã vô tình chặn tạo.

Không sửa SRS/Jira/backend trong lượt này. Frontend mock sẽ thể hiện quy tắc mới; API thật vẫn tắt. Các tests/fixtures tạo role tùy ý ở repository độc lập là lịch sử/hợp đồng generic, không phải chế độ product hiện tại.

**Đã kiểm lại sau pull27/10:** `develop@953f597` vẫn chỉ có hai role trong DefaultRoles và còn endpoint Create/Copy/đổi tên. Việc PR15/16/17 merge chưa giải quyết chính sách ba vai trò; `48ae1e0` ở đoạn trên là snapshot cũ. Giữ nguyên đề xuất bên dưới và API role tắt. [Audit source mới](../reports/BACKEND_DEVELOP_UPDATE_AUDIT_2026-10-27.md).

## Đề xuất cụ thể gửi BA/backend khi nhóm review

1. BA xác nhận ba mã role ổn định và quyền khởi tạo của Nhân viên; phân biệt actor Staff với tên role vùng. Chưa dùng tên hiển thị hoặc GUID mock làm mã role backend.
2. Backend provision đúng ba role cho mỗi HTX; migration phải kiểm các role tùy chỉnh/grant hiện có. Không xóa hoặc đổi tên role đang có một cách tự động; cần mapping được nhóm duyệt nếu dữ liệu thật đã phát sinh.
3. Chặn Create/Copy role tại API theo chính sách mới; chặn PUT đổi tên nhưng tiếp tục cho sửa description/matrix, kiểm View/supported actions/scope và audit. Ẩn nút ở frontend không thay thế việc chặn server.
4. Discontinue chỉ khi không có grant hiệu lực. Reactivate đưa role về In Use, giữ nguyên matrix và các grant đã revoked. Trả rowVersion mới và dùng lại ở lần lưu tiếp theo.
5. Kiểm thử account assignment chỉ nhận ba role còn In Use; role bị ngừng không xuất hiện cho cấp mới. Quyền thực trả từ `/me/permissions`, không suy từ label Quản lý vùng/Kế toán/Nhân viên.

Đây là đề xuất đối chiếu cho nhóm, chưa phải contract API đã đổi hoặc đã phát hành. Khi ghép API cần đọc revision backend và chốt migration/role codes thực.

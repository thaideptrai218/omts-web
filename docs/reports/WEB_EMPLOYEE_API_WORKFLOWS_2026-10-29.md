# Hồ sơ, liên kết tài khoản và tình trạng nhân viên API — 29/10/2026

Tiếp tục màn API thật theo yêu cầu người dùng; nguồn SRS v5.8 UC10, Jira OMTS-203, backend develop953f597 và các quyết định WEB-EMP-LIST/ZONE/EMPLOY/ACCOUNT. Cùng nhánh feature/OMTS-132-web-foundation và PR3 draft, không merge develop, không sửa backend/SRS/Jira hoặc mở luồng tạo tài khoản chưa được chốt contract.

## Phạm vi

`/workspace/employees` và `/employees` ở API mode dùng màn nhân viên riêng, dữ liệu qua repository/BFF. Chỉ Owner. Danh sách mặc định Đang làm việc, tìm tên/SĐT debounce300ms, lọc tình trạng/vùng,20 dòng/trang, hiển thị vùng và account/status. Form tạo/sửa có dữ liệu cá nhân, ngày sinh Việt Nam, vùng làm việc, ngân hàng đủ-ba-hoặc-trống, SĐT chuẩn hóa và số tài khoản giữ0 đầu. Vùng ngừng đang gắn phải được Owner bỏ trước lưu, không tự xóa hoặc cho chọn lại. Không tự tạo account hoặc đổi quyền khi lưu nhân viên.

Tài khoản có thể liên kết lấy từ endpoint linkable-accounts; gắn sau hoặc lúc tạo hồ sơ, tải lại picker giữ lựa chọn đang nhập. Bỏ liên kết xác nhận riêng, không xóa/khóa account; giữ các trường nháp khác và cập nhật rowVersion để lưu tiếp. Nghỉ việc/đi làm lại phải lưu/hủy nháp trước; ngày nghỉ không sau hôm nay UTC+7; ghi riêng trạng thái, không tự lưu metadata, khóa/mở hoặc cấp quyền. Follow-up chỉ mở đúng account để Owner kiểm tra, có thể Để sau. Generic account screen hỗ trợ `accountId` từ URL bằng GET kiểm quyền; không tự chạy mutation.

MSG06 giữ nháp, tải bản mới hiển thị đủ trường cá nhân/vùng/ngân hàng/account/status, rồi người dùng chọn dùng bản đã lưu hoặc chủ động giữ nháp với version mới. Chưa rõ kết quả, kể cả401 sau commit, không tự retry hoặc mở lại nút save chỉ vì GET thành công. Tạo mới chưa rõ kết quả cho tìm/đối chiếu thủ công, không tạo lại tự động. Bản ghi trùng chỉ GET sau bấm Đối chiếu; việc đọc để so sánh giữ nháp cho đến lựa chọn rõ ràng.

MSG24 vẫn thiếu structured employee_name ở backend. Code và existingEmployeeId được kiểm/project, không parse raw detail hoặc bịa tên. UI hiện giữ phản hồi lỗi chung và nút đối chiếu thủ công; câu MSG24 tạm không tên đang chờ người dùng chọn theo WEB-EMP-ERROR-01. Chưa coi phần thông báo đủ tên là hoàn tất. Tạo account username tự sinh/secret-free và Staff email-OR-phone onboarding vẫn chờ backend như trước.

## Server

Nhánh `/api/operations/employees` có plan GET list/detail/linkable và POST create/update/unlink/end-employment/reinstate, cố định upstream method/path. Strict body/query từ chối field status, khối tạo account/credentials, ngày/ID/version sai. CSRF/bounded JSON/G1 phase/Owner/recheck trước trả cả dữ liệu lẫn error ID. DTO lọc raw message/password/token/field lạ; validate record ID và followUp account khớp account của employee. Mở rộng allowlist metadata create cùng update/unlink, không đổi định dạng MSG06 hoặc suy tên MSG24. Không shared cache/refresh/retry/offline queue.

## Bằng chứng

HTTP thật Owner tạo `QA API EMP MVTGQV1V`, duplicate409MSG03 có đúng ID, sửa ngân hàng có0 đầu, stale409MSG06, ngày nghỉ hợp lệ/future400/same-status409MSG61, bộ lọc tình trạng/vùng; Manager/Trader403 và anonymous401, không trả dữ liệu cá nhân. QA employee cuối ở Left và không liên kết account.

Không có Staff chưa liên kết trong DB demo. Ca thực tế dùng account seed `nhanvien.hethan` theo DemoEmployeePlans: tạm unlink khỏi profile seed, link QA, đi làm lại/nghỉ việc và follow-up, unlink QA, lưu tiếp với version mới; trong finally khôi phục account về profile seed. Đã kiểm khôi phục thành công; status account, mật khẩu, grant và tình trạng làm việc của profile seed không đổi. Việc đổi liên kết có audit và rowVersion mới; không nói database hoàn toàn không thay đổi. Sau khôi phục, thử gắn trùng vào QA nhận MSG24 và đúng ID profile seed. Không reset database hoặc chạy seed.

Browser Owner trên build cuối: default401, tìm QA ở All, form dữ liệu thật, ngân hàng0 đầu; bản nháp chặn đổi tình trạng, lưu hồ sơ→đi làm lại có xác nhận→nghỉ việc; ngày2099 bị chặn ngay trong form, ngày29/10/2026 lưu thành công. Form360/1024 CSSpx được đo DOM, không tràn ngang ở360; viewport được khôi phục. URL accountId đã mở đúng tài khoản seed để xem, không chạy khóa/mở. Đã logout về form trống. Ảnh bằng chứng ở outputs của chat. Link/unlink và follow-up ghi thật qua HTTP; không nhận các ca đó là browser mutation nếu chưa có bằng chứng tương ứng.

Review cuối tách callback đọc/adopt khỏi callback ghi để tải bản đã lưu không hiện nhầm thông báo Đã lưu hồ sơ; thêm hồi quy, không thêm mutation hoặc đổi bước nghiệp vụ. Kiểm source cuối:236 file/2.626 test PASS,0 skip với Redis DB2, gồm35 ca mới; lint/typecheck/build29/29 và36 built-product assertions đạt sau sửa. Source có sửa helper test create và bỏ option Playwright `exact` dùng nhầm trong Testing Library; không nới schema hay quality gate. Log/ID/test JSON ở learning ignored. Kết quả local không tự là CI/TLS/deployment hoặc nghiệm thu cả SRS.

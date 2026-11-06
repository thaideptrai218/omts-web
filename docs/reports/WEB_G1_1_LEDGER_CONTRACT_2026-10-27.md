# G1.1 — Contract và mô hình kiểm thử điều phối đăng nhập

Ngày kiểm: 27/10/2026. Nhánh: `feature/OMTS-132-web-foundation`.

Duy Thái đã chốt G1: cookie HttpOnly điều phối riêng và ledger Redis; browser thiếu Web Locks sẽ chặn đăng nhập API. Đợt này chỉ thực hiện contract và fixture theo quyết định đó. Không phát hành cookie mới, không nối Redis ledger, không mount POST login hoặc bật refresh.

## Những phần đã làm

`src/server/auth/login-ledger.ts` mô tả bản ghi điều phối và các thao tác đọc, bắt đầu, công bố kết quả, kết thúc thất bại, vô hiệu hóa, đối chiếu liên kết phiên. Bản ghi có revision, generation và attempt ID để kết quả cũ không thể ghi lên lượt mới. Các trạng thái là idle, pending, check-required, active và revoked.

Mô hình RAM trong `__tests__/memory-login-ledger.ts` chỉ phục vụ kiểm thử. Tạo context mới là helper riêng; các lệnh ghi không tạo lại context đã mất. Lease hết hạn chuyển sang check-required, không tự cho gửi lại mật khẩu. Kết quả không xác định cũng yêu cầu kiểm tra phiên. Invalidate là trạng thái cuối đối với context đó. matchBinding chỉ đối chiếu quan hệ, không cấp quyền đăng nhập.

Ledger có thể được giữ tới mốc hết hạn của binding đang lưu; đây là thời gian giữ bản ghi điều phối, không phải gia hạn phiên C3A. Luồng chạy thật sau này phải dùng thao tác Redis nguyên tử và kiểm cả session store; mô hình RAM không chứng minh điều này.

## Kiểm chứng và tự review

9 test contract đã PASS trong full suite: 20 lượt begin cạnh tranh; rejected và unknown; lease hết hạn; publish/binding/retention; invalidate và context bị mất; attempt/generation không khớp; clock không hợp lệ; cô lập snapshot đầu vào/đầu ra. Kiểm tra input dùng schema nghiêm ngặt.

Đã rà để fixture không được import vào product runtime và contract không chứa mật khẩu, token hay cookie browser. Không phát hiện thêm lỗi cần sửa trong phạm vi reference model; chưa có bằng chứng Redis/process/browser race. Các phần orchestrator, cookie bootstrap, Web Locks, HTTP handoff muộn, logout phối hợp và Redis fault tests vẫn pending trong plan API.

Ưu tiên tiếp theo được người dùng đổi sang hoàn thiện luồng quản trị mock cho buổi kiểm tra. Xem [báo cáo bản review](WEB_REVIEW_READINESS_2026-10-27.md); không đánh dấu G1 runtime hoặc W3 hoàn tất.

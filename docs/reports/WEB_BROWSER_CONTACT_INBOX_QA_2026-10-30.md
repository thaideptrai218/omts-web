# QA browser — hủy liên hệ và thông báo, 30/10/2026

Tiếp nối [failure/OTP QA](WEB_BROWSER_FAILURE_OTP_QA_2026-10-30.md). Người dùng chọn chưa đổi mật khẩu, tiếp tục các màn khác. Không ghi nhận reset/login bằng mật khẩu mới là PASS; không đổi credential qua CLI để thay ca browser.

## Kiểm bằng browser QA3003

Backend8081, RedisDB3 riêng. Fetch backend vẫn develop953f597 và Zalo dc00b2f; chưa có API nghiệp vụ SRSv2 mới. Không đổi backend hoặc dữ liệu nghiệp vụ8080, không merge PR3.

| Ca | Kết quả |
| --- | --- |
| Trader QA riêng `tr40783326` | Đăng nhập bằng credential hiện tại, menu đúng Trader; hồ sơ giữ email và phone QA đã xác minh |
| Contact email OTP | Gửi mã tới email giả lập QA; đóng Để sau rồi mở lại giữ cùng deadline, không gửi thêm mã; mã đúng tạo nháp chờ Lưu, email canonical vẫn giữ nguyên |
| Hủy nháp liên hệ | Tiếp tục sửa giữ nháp; Bỏ thay đổi loại nháp/proof, Lưu và Hủy disabled; reload xác nhận email cũ không đổi. Phát hiện thông báo chờ Lưu còn sót, sửa như bên dưới |
| Trader notification preferences | Catalog Orders/QR, mandatory InApp và Push readonly, Zalo ineligible disabled; bật Orders Email → Đóng → Tiếp tục sửa giữ nháp → Save → reopen vẫn bật; khôi phục tắt và Save thành công |
| Trader inbox | Rỗng, 0 chưa đọc, read-all/paging disabled đúng dữ liệu |
| Owner inbox | 14 thông báo, 9 chưa đọc; đánh dấu riêng cảnh báo QA giảm còn8; read-all về0, mở lại vẫn0 và read-all disabled |

QA provider là Fake Development, không nghiệm thu gửi email/SMS thật. Đã đọc thông báo trong database QA; endpoint không có thao tác unread để khôi phục. Không thay trạng thái request Trader hay quyền tài khoản. Tùy chọn Email của Trader QA đã về giá trị gốc, contact/name/password giữ nguyên. Các phiên browser của lượt trước build đã đăng xuất.

## Lỗi và bản sửa

`PersonalApiEditor` hủy nháp thành công đã xóa contactFlow/error/dialog nhưng bỏ sót notice. Vì vậy dòng “Liên hệ đã xác minh, chờ Lưu thay đổi” còn hiện dù không còn nháp và các nút Lưu/Hủy disabled. Chỉ thêm xóa notice trong nhánh discard thành công. Không đổi business step, validation, endpoint, TTL, session hoặc conflict policy.

Thêm assertion vào regression cancel hiện có: trước sửa1/6fail đúng paragraph cũ; sau sửa nhóm personal/inbox/verification **8file/46PASS**. Lint/typecheck, build41routes và61built-product assertions PASS. Không chạy lại full local cho bản sửa một dòng; full2879/realRedisDB2 của5ea37db là snapshot trước, không gắn thành full source mới.

Replay bản build cuối qua QA3003: yêu cầu/xác minh mã mới → pending Save → Bỏ thay đổi xóa cả nháp và notice, Lưu/Hủy disabled, email cũ giữ nguyên. Mở lại Đổi email về form bắt đầu, chứng minh flow cũ đã kết thúc; không tự gửi mã. Đóng và logout thành công. Console đọc cuối lượt không có error/warn. Browser ghi nhận CSSwidth1280, không tràn ngang; viewport capability trỏ sang user tab12 trong khi test ở tab13, nên không áp override nhầm tab hoặc nhận360/1024 là đã replay. Bằng chứng narrow/desktop cũ được phân biệt trong báo cáo trước.

Ảnh workspace outputs: `qa-contact-verified-unsaved.png`, `qa-contact-cancel-stale-notice-before.png`, `qa-contact-cancel-fixed.png`, `qa-trader-email-preference-restored.png`, `qa-owner-inbox-read-all.png`.

Giới hạn còn giữ: bước Save contact/password mới chưa chạy browser; partial-save conflict/unknown vẫn có bằng chứng HTTP/component riêng. Không cấp grant/mở khóa seed để tạo ca thử. Các dependency Staff onboarding/create-reset, fixed roles, Manager license, certificate delete, HTX bank và APIv2 giữ nguyên.

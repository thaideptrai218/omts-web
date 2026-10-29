# Hồ sơ cá nhân, thông báo và đọc/thu hồi quyền — 29/10/2026

Tiếp tục các màn API thật, ưu tiên chức năng theo yêu cầu. Đọc AGENTS/context, UC05/06/11/12 SRS v5.8, Jira OMTS-201/203, quyết định role/account/profile và controller/service backend develop953f597. Người dùng đã chốt WEB-NOTIFY-02 trong lượt này: dùng catalog API theo loại tài khoản; Web sửa InApp/Email/Zalo đủ điều kiện, Push chỉ xem. Không sửa backend/SRS/Jira hoặc merge develop.

## Màn và dữ liệu

`/account` dùng màn riêng. Hiện username, ID, loại tài khoản, email/phone và tình trạng xác minh, các vùng–vai trò hiệu lực từ profile API. Không suy quyền từ một role name. Tên hiển thị được validate và lưu với rowVersion; lỗi giữ nháp, MSG06 có so sánh và lựa chọn dùng bản mới/giữ tên đang nhập với version đã đối chiếu. Đọc/adopt không báo nhầm đã lưu. Có xác nhận hủy nháp và lối vào đổi mật khẩu/thông báo. Email/phone ở lát này chỉ đọc, không coi là đã hoàn thành contact OTP.

Tùy chọn thông báo mở từ hồ sơ. Nhóm theo response backend (Owner6, Staff4 gồm Orders, Trader2); bốn kênh có lý do khóa rõ. InApp bắt buộc không thể tắt; mọi Push chỉ xem; Email/Zalo cần eligible. Chỉ gửi các ô chỉnh được đã thay đổi, không gửi nguyên ma trận hoặc lựa chọn Push. BFF đọc lại catalog/eligibility trước PUT; backend tiếp tục kiểm lại khi ghi. Đây là endpoint không có version, nên patch từng ô giảm ghi đè ô không sửa nhưng không tạo optimistic concurrency cho cùng ô. Lỗi MSG21/23 cần đối chiếu trước tiếp tục; unknown write/401 không replay hoặc tự mở khóa sau GET. Nhận success envelope cũ và PR19: notice có giá trị được project thành MSG-ACCOUNT-21 tiếng Việt và hiện thay câu thành công. Không parse/render raw prose. noticeCode không được hỗ trợ hoặc mâu thuẫn với notice làm kết quả ghi chưa được xác nhận. Không đăng ký thiết bị Push trên Web.

Trong hồ sơ tài khoản, **Xem phân quyền vùng** đọc grant thật: hiệu lực/chưa đến hạn/hết hạn/đã thu hồi, vùng hoặc Tất cả vùng, ngày và lý do thu hồi. Bộ lọc chỉ đổi hiển thị. Đọc và thao tác grant giữ nháp metadata tài khoản. Owner có thể thu hồi grant hiện có bằng ID trả về, nhập lý do và xác nhận riêng; giữ dòng lịch sử, không tự cấp lại, khóa tài khoản hoặc sửa metadata. Tạo grant mới và sửa role vẫn chờ ba mã role cố định; thu hồi grant hiện hữu không suy role code từ tên/GUID.

Popup vai trò có ma trận chỉ đọc từ permissions đã lưu + catalog chức năng/backend supported actions, scope và số tài khoản/vùng đang dùng. Có phân biệt chưa cấp/không hỗ trợ, dashboard tiles và các tên tài khoản trong impact. Không có editor/Create/Copy/đổi tên/ngừng/khôi phục role trên API khi contract fixed roles chưa khớp.

## BFF

| Web API | Backend | Quyền/giới hạn |
| --- | --- | --- |
| GET/PUT `/api/account/profile` | `/api/me/profile` | Chính tài khoản application; PUT strict displayName/rowVersion |
| GET/PUT `/api/account/notification-preferences` | `/api/me/notification-preferences` | Chính tài khoản; patch tối đa18 ô, không Push, unique category/channel |
| GET `/api/account-grants?accountId=...` | `/api/accounts/{id}/grants` | Owner, đọc |
| POST `/api/account-grants/revoke` | `/api/accounts/{id}/grants/{grantId}/revoke` | Owner + CSRF + reason/confirmed, response phải đúng ID/Revoked |
| GET `/api/permission-functions` | cùng path | Owner, đọc |
| GET `/api/role-impact?roleId=...` | `/api/roles/{id}/impact` | Owner, đọc |

Fixed path/method/schema, no-store/Vary Cookie/nosniff, bearer ở server, CSRF cho ghi, bounded JSON và kiểm lại cùng phiên trước trả dữ liệu/lỗi. Profile response phải khớp accountId và subjectType của phiên; bỏ raw message/confirmMessage và field lạ. Lịch sử/count/catalog không phải bằng chứng cấp quyền cho caller khác Owner. Không nhận URL tùy ý/extra query hoặc target account trong API cá nhân.

Build đầu phát hiện GET-only grant route bị prerender theo mock env ở build. Thêm `connection()` để private access reads luôn chạy theo request; kiểm built product API từ build mock để tránh trả404 tĩnh ở runtime API. Không nới cache hoặc session policy.

## Bằng chứng và giới hạn

Source cuối: 246 file kiểm thử / **2.761 PASS, 0 skip**, Redis integration chạy trên DB2 riêng; npm run lint, npm run typecheck và npm run build đạt35/35. Built-product45 assertions đạt với runtime API từ build mock. HTTP thật của các script QA đều đạt; không dùng kết quả này thay cho CI của commit sẽ push. Mã mới không có legacy và notification notice của PR19 được kiểm bằng fixture vì nhánh backend đó chưa deploy.

HTTP thật Owner/quanlyvung1/ketoan/thuonglai1: GET/PUT profile đúng tài khoản, stale409MSG06, username-bypass400, CSRF403; catalog6/4/4/2, bắt buộc/Push/Zalo bị chặn đúng, save InApp ở nhóm tùy chọn và reread. Tên và các ô InApp đã đổi được khôi phục trong finally; không đổi password/contact hoặc các dòng grant gốc của seed. Trader seed không có ô InApp tự chọn nên không nhận là đã test write hợp lệ cho Trader; Email eligible được kiểm bằng fixture, Zalo runtime hiện chưa cấu hình.

Browser Owner: sửa tên nháp→mở/lưu thông báo→đóng/mở lại kiểm đã lưu→khôi phục ô gốc, nháp tên vẫn còn; lưu tên→khôi phục tên Nguyễn Văn Hải. Mở account seed nhanvien.hethan theo ID, sửa nháp metadata rồi xem grant Expired/ngày thật, nháp giữ nguyên; đã bỏ nháp bằng nhập lại giá trị gốc, không lưu account. CSS360/1024 không tràn ngang cho profile, notification dialog và grant history; ảnh ở outputs. Browser không tự thu hồi grant seed.

Lệnh thu hồi được kiểm server/component fixtures cho Owner/CSRF/schema/reason/confirmed, ID/state response, phiên đổi sau commit và unknown-write không replay. HTTP thật tạo riêng một dòng QA đã hết hạn từ 01/01/2000, assert state Expired rồi thu hồi qua BFF; dòng QA được giữ ở Revoked, lệnh lặp trả409 MSG61. Các dòng seed gốc và role impact giữ nguyên; tài khoản nhanvien.hethan bị từ chối đăng nhập cả trước/sau vì không có grant hiệu lực, nên không nhận là đã so sánh permissions DTO của tài khoản này. Không cấp thêm quyền hiện tại. Browser mở xác nhận, kiểm lý do trống bị khóa/có lý do được mở, chọn Để sau và kiểm grant gốc vẫn Expired. Ma trận thật26 chức năng/2role/impact cũng được kiểm; Manager/Accountant/Trader và anonymous không đọc được catalog/impact Owner. Tester chỉ thu hồi grant QA được thống nhất; re-grant tạo dòng mới, không có undo làm sống lại dòng đã thu hồi.

Các luồng OTP đăng ký/khôi phục/contact/email-password còn cần giao thức giữ proof server, [G2 đang đề xuất](../decisions/WEB_VERIFICATION_FLOW_PROPOSAL_2026-10-29.md), chưa tự áp thiết kế lưu trữ/partial save. Gate Staff email OR phone, generated-username/secret-free account-create, role codes và ngân hàng HTX vẫn giữ quyết định trước. Không có refresh/offline queue. Đây không phải nghiệm thu toàn SRS.

Contract mới và các thay đổi Jira được tách rõ trong [báo cáo PR19/Jira](WEB_JIRA_PR19_CONTRACT_UPDATE_2026-10-29.md). PR19 chưa merge/deploy: compatibility mới được kiểm bằng fixture; HTTP thật ở develop953f597.

Cập nhật sau snapshot9391d8b: người dùng đã duyệt G2 và partial-save; các luồng OTP/contact/email-password đã nối và kiểm, xem [báo cáo G2](WEB_G2_VERIFICATION_API_2026-10-29.md). Phần nói G2 chưa duyệt ở trên là thời điểm trước quyết định mới, không phải trạng thái cuối.

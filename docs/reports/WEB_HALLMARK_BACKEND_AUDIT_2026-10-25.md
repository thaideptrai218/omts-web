# Hallmark và khả năng ghép backend cho OMTS Web

Ngày 25/10/2026. Web: `feature/OMTS-132-web-foundation`. Backend: đọc `origin/develop@776fbc0` sau `git fetch`; checkout backend vẫn ở `48ae1e0`, không sửa mã/DB backend. Đây là kiểm tra source và giao diện hiện tại, không phải nghiệm thu API end-to-end.

## 1. Hallmark: cài và dùng thế nào

[Hallmark v2](https://github.com/Nutlope/hallmark) được cài vào `C:\Users\duyth\.codex\skills\hallmark` bằng skill installer từ `Nutlope/hallmark/skills/hallmark`. Công cụ kiểm tra trình duyệt dùng `puppeteer-core` cài toàn máy. Hallmark là hướng dẫn/auditor cho tác nhân thiết kế, không phải thư viện React: không thêm runtime package vào `omts-web`, không thay nghiệp vụ hay copy template. Skill có hiệu lực tự động từ lượt làm việc kế tiếp; lượt này đã đọc hướng dẫn và gọi `sloplint.mjs` trực tiếp.

Lượt đầu kiểm tra tĩnh 88 file có 28 FAIL mức floor. Sau chỉnh nhẹ biểu tượng quyền bị từ chối và nhãn chữ in hoa giãn cách, kiểm tra tĩnh còn 12 FAIL trên 89 file. Đã thay emoji cấm bằng SVG trang trí dùng chung và giữ nguyên nội dung, điều kiện quyền. Ảnh/chẩn đoán tạm được đặt trong `.hallmark/` và đưa vào `.gitignore`. `AGENTS.md` nhắc dùng kết quả audit có chọn lọc cho các màn quản trị.

Kiểm tra render trang `/login` trên production build lấy 5 ảnh ở 375, 1280, 1440, 1920 px. Trước sửa, viền ô nhập chỉ đạt **2,56:1**, dưới ngưỡng 3:1 của Hallmark gate 40. Token `--omts-color-border-strong` được đổi từ `#94a3b8` sang `#64748b` trong `src/app/globals.css`. Chạy lại sau build: gate 40 biến mất; tổng còn **12 FAIL, 1 REFLEX, 17 WARN**. Đây là tổng chẩn đoán, không phải 12 lỗi chức năng đã xác nhận. Kiểm tra mới chỉ render `/login`, không đại diện cho mọi route/popup.

Các mục còn lại cần xét theo giao diện thật: gate 4 báo ba khối viền lồng nhau trong form tài khoản/quyền; gate 10a báo sidebar đổi chiều rộng khi hover, nhưng hành vi này được người dùng yêu cầu; gate 19 nhận cả dấu gạch trong placeholder; gate 20 đòi “Hallmark stamp” dù Web không được tạo bằng Hallmark; gate 34 muốn `overflow-x: clip` toàn trang, cần kiểm tra có che focus/modal hay không; gate 63 báo hai chuỗi metadata có dấu phân cách giữa các thông tin tài khoản. REFLEX 26b muốn trạng thái `:active` cho nút. Chưa áp các sửa có thể đổi thông tin, hành vi sidebar hoặc che nội dung chỉ để giảm số cảnh báo.

Kiểm chứng sau thay đổi: `npm run lint`, `npm run typecheck`, `npm test` (**1254 PASS, 27 SKIP Redis**), `npm run build` đều đạt. Gate 40 không còn ở lần render mới. Các test Redis bị skip vì lượt này không có endpoint Redis; kết quả build/test không chứng minh API/DB thật.

## 2. Backend có gì mới

Hai commit sau snapshot `48ae1e0` là `13aed3b` (OMTS-211) và `776fbc0` (OMTS-213). `13aed3b` thêm API đo chất lượng nước theo vùng: ghi số đo, lịch sử, biểu đồ/xuất dữ liệu, sửa/hủy số đo và ngưỡng; migration thêm các cột/index liên quan. Mã nguồn migration hiện diện chưa chứng minh nó đã chạy trên SQL Server.

`776fbc0` thêm `docker-compose.yml`: SQL Server, seed một lần (`seed --bootstrap --demo`), API Development tại cổng 8080, health và Swagger. Demo seed chứa Owner, Staff/quản lý vùng/kế toán, hai Trader, vùng nuôi, giấy phép, bè, nhân viên, nhà cung cấp, vật tư và phiếu nhập; có tài khoản thường và tình huống forced password, chưa xác minh số điện thoại, grant hết hạn. Đây là **dữ liệu Development local**, không chứng minh QA đã có account/DB tương tự. HTX demo ở Vân Đồn khác HTX Trung Nam đang có trong mock Web: khi ghép API phải lấy định danh/HTX từ response thật, tuyệt đối không trộn hai nguồn.

`docker ps` hiện báo không kết nối được `dockerDesktopLinuxEngine` (named pipe không tồn tại); cổng 8080/1433 không có listener trong lượt này. Vì thế chưa chạy seed, chưa hỏi SQL, chưa smoke Swagger hoặc login thực tế. Báo cáo sửa Docker/Redis ngày 24/10 là bằng chứng của phiên đó, không chứng minh runtime đang sẵn sàng hôm nay.

## 3. Đủ API/DB để ghép phần nào?

| Lát Web | Source `develop@776fbc0` | Kết luận |
| --- | --- | --- |
| Đăng nhập, danh tính, quyền, hồ sơ, logout | Có `/api/auth/login`, `/api/me`, `/api/me/permissions`, `/api/me/profile` và `/api/auth/logout`; demo Owner/Staff; schema, transport và session helpers Web đã chuẩn bị | **Đủ để bắt đầu tích hợp theo lát** sau khi chạy/kiểm chứng local API + Redis và hoàn tất DAL/Route Handler/guard; Web hiện vẫn dùng mock |
| Refresh | Có `/api/auth/refresh` và rotation, request chỉ có `refreshToken`; chưa thấy retry/idempotency cho kết quả không xác định | **Chưa bật refresh thật** theo quyết định trước; mất phản hồi sau rotation có thể khiến gửi lại token cũ bị xử lý như replay |
| Lưu hồ sơ gặp MSG06 | Backend trả `currentRowVersion`, tên người sửa và thời gian chỉ được ghép trong message text | **Chờ backend trả structured editor/time** theo quyết định đã chốt; không parse text hoặc bịa fallback |
| Chỉnh grant vùng–vai trò đã lưu | `/api/accounts/{id}/grants` có GET/POST/revoke, không có PUT edit trực tiếp | **Chưa đủ hợp đồng** cho thao tác sửa trực tiếp mà người dùng đã yêu cầu; cần BA/backend thống nhất cách đổi an toàn |
| Dashboard số liệu/thu chi/thu hoạch và QR công khai | Không thấy endpoint aggregate chuyên cho các số liệu đó hay route QR truy xuất tương ứng trong controllers hiện tại | **Chưa đủ cho toàn bộ Web**; không tự tính hoặc trình bày số liệu mock như dữ liệu thật |

Các API farm/input/employee và ENV mới giúp các màn nghiệp vụ khác tiến gần tích hợp hơn, nhưng cần audit từng contract, quyền và dữ liệu seed trước khi bật. Staff “xác minh một trong email hoặc SĐT” là quyết định UI đã chốt với người dùng; backend hiện vẫn gate số điện thoại, cần BA/backend xử lý trước khi thay luồng thật. Đừng xem CORS localhost trong Compose là lời giải cho BFF session: Web vẫn giữ phương án Next.js BFF + Redis runtime, cookie HttpOnly, token ở server.

## 4. Việc tiếp theo, theo micro-task

1. Dùng checkout backend ở commit đã kiểm toán để chạy Docker/seed trên máy, kiểm tra `/health/ready` và contract login/profile bằng tài khoản demo; không reset volume đang dùng. Chốt riêng fixture QA nếu cần kiểm thử môi trường nhóm.
2. Đối chiếu OpenAPI và response thực của **mỗi** lát với schema Web; cập nhật contract test có kiểm soát, không coi source snapshot là endpoint đang deploy.
3. Hoàn tất BFF DAL/Route Handler, session cookie/CSRF/permission guard theo plan W2.2e5 → W2.4 → W3/W4/W5. Giữ refresh tắt cho đến khi backend có chính sách retry/idempotency được thống nhất. Không trộn mock identity với phiên API thật.
4. Gửi BA/backend các khoảng trống: MSG06 structured editor/time, quy tắc email hoặc SĐT, chỉnh trực tiếp grant, API aggregate/QR. Không sửa SRS/Jira/backend thay họ.
5. Polish từng màn Web bằng Hallmark cùng review thủ công ở 360/1024 px, keyboard/focus và trạng thái thật; ưu tiên những vấn đề đo được như tương phản trước tiêu chí thẩm mỹ chung.

Không commit/push ở lượt audit này. Các thay đổi Web đã có từ trước trong working tree được giữ nguyên.

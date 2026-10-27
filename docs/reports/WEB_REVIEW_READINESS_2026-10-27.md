# Hoàn thiện các luồng quản trị Web để kiểm tra tiến độ

> Snapshot trước đợt polish cùng ngày. Duy Thái đã chốt chuyển sang ba role cố định; các mục tạo role tùy ý bên dưới là lịch sử. Hướng dẫn hiện tại nằm trong [báo cáo polish](WEB_MANAGEMENT_POLISH_REVIEW_2026-10-27.md) và Reviewer guide đã cập nhật. Không sửa lại bằng chứng đã chạy ở snapshot này để giả rằng policy mới có từ trước.

Ngày: 27/10/2026. Nhánh: `feature/OMTS-132-web-foundation`; chưa merge develop. Các thay đổi mô tả ở đây nằm sau baseline c2415cc; không dùng kết quả local làm bằng chứng GitHub CI.

## Phạm vi và quyết định

Duy Thái yêu cầu ưu tiên trình diễn các chức năng quản trị đang có. Đã xác nhận chưa thêm Đăng ký Thương lái Web. API/refresh thật vẫn tắt; không chỉnh backend, DB, SRS hoặc trạng thái Jira. Đây là bản review mock có thể thao tác xuyên màn, chưa phải phần mềm tích hợp hoàn chỉnh.

Kế hoạch chi tiết: [R1–R9](../WEB_REVIEW_READINESS_PLAN.md). Hướng dẫn chạy và kịch bản cho giảng viên: [Reviewer guide](../REVIEW_GUIDE.md). G1 contract có [báo cáo riêng](WEB_G1_1_LEDGER_CONTRACT_2026-10-27.md); reader W3.2 vẫn chưa nối vào AuthProvider chạy thật.

## Những lỗi/thiếu sót đã sửa

| Phần | Vấn đề trước sửa | Hành vi sau sửa và bằng chứng |
| --- | --- | --- |
| R1 — Mật khẩu | Auth, recovery và đổi mật khẩu dùng state riêng, dễ hiển thị lưu thành công nhưng login vẫn nhận mật khẩu cũ | Credential directory RAM dùng chung; proof recovery chỉ cập nhật đúng recipient. Root service regression kiểm mật khẩu cũ/mới và recipient không tồn tại |
| R2 — Hồ sơ | Tên/contact lưu ở profile không phản ánh đầy đủ sang lần đăng nhập sau | Verified save cập nhật identity và alias; alias cũ bị retire; kiểm trùng contact giữa các account. Test lưu tên, thay email và logout/login |
| R3 — Quản trị | Các mock repository độc lập khiến role/account mới không xuất hiện ở picker màn khác | Một composition chia sẻ snapshots role/account/employee. 4 test tích hợp kiểm tạo role, role đang được dùng, link/unlink, số liệu dashboard |
| R4 — Dashboard | Counter lấy fixture cố định | Đọc snapshot hiện hành. Thu chi, bè và sản lượng tiếp tục no-data, không bịa hoạt động kinh doanh |
| R5–R6 — Staff | Tài khoản Owner vừa tạo chưa có đường đăng nhập thực tế trong mock | Username mới dùng được, đổi mật khẩu và xác minh một contact; hồ sơ/role/scope từ bản ghi đó. Khóa chặn login, reset vô hiệu trạng thái cũ và yêu cầu đúng bước còn thiếu. Verified Staff chỉ đổi mật khẩu, không bị bắt xác minh lại |
| R7 — Thông báo | Có service/domain nhưng chưa có nơi thao tác trong profile | Dialog load/draft/save/cancel; lý do khóa/unavailable hiện tại chỗ, email theo verified status. 3 test UI kiểm lưu/reopen, hủy draft và cập nhật điều kiện email |
| R8 — Menu hẹp | Link hồ sơ không đóng drawer | Chạy callback đóng giống link menu; regression React test và kiểm tra browser sau build |
| R9 — Chạy kiểm tra | Worker mặc định trên Windows gây tranh chấp tài nguyên | Vitest dùng 1 worker Windows, Next build 2; Linux/CI giữ cấu hình worker cũ. Không bỏ test hoặc tăng timeout để che lỗi |

AuthProvider có thêm 4 regression test: chỉ chuyển từ password gate vào ứng dụng sau khi repository xác nhận phiên; loại password result sau logout; loại contact-verification result sau logout; vẫn nhận kết quả contact hiện hành. Domain password-only gate có test riêng. Bộ root service hiện có 11 test; đây là kiểm service/React, không phải browser E2E toàn bộ.

Mock navigation của Staff chỉ có phạm vi tổng quan theo grant, không suy quyền quản trị Owner từ tên role. Notification category/default là fixture minh họa ACS-07, còn chờ catalog BA/backend; Push/Zalo không được bật giả và không thực sự gửi SMS/email.

## Kết quả chạy lệnh

| Kiểm tra | Kết quả local |
| --- | --- |
| `npm run lint` | PASS, không warning |
| `npm run typecheck` | PASS |
| `npm test` (cấu hình mặc định Windows mới) | 140 files PASS, 4 SKIP; 1.597 test PASS, 31 Redis SKIP; 99,30 giây |
| `npm run build` | PASS; 2 workers, 18/18 trang, static generation 879 ms; lần này không có timeout/retry trang |
| `npm run test:session-pages` | PASS 24 HTTP assertions trên built product; không suy ra TLS/browser/API backend hoạt động |

31 test Redis bỏ qua vì không cung cấp endpoint kiểm thử trong lần này. Không có fresh Redis/HTTPS/QA/backend E2E. Các kết quả Redis ở báo cáo trước là lịch sử, không phải bằng chứng mới của lượt này.

## Lỗi thật gặp trong quá trình làm

Lượt full test 4 workers trước đó gặp timeout ở beforeAll của ESLint và ETIMEDOUT khi test con khởi động CLI Redis. Một lượt build 15 workers bị timeout lần đầu ở 7 trang; Next retry rồi hoàn tất. Đây là hiện tượng chậm ở công cụ/setup, chưa chứng minh nguyên nhân duy nhất là RAM. Máy được quan sát có khoảng 3,8 GB RAM trống trên tổng 15,6 GB. Giới hạn worker Windows để giảm cạnh tranh; default test và build sau sửa đều PASS như bảng trên. Không tăng timeout hoặc bỏ các test đó.

Lint bắt `prefer-const` ở composition quản trị: provider dùng biến khởi tạo muộn nhưng không cần gán lại. Đổi thành const, giữ callback chỉ chạy sau khi khởi tạo repositories. Test role đầu tiên thiếu toàn bộ hàng permission nên validator từ chối đúng; sửa dữ liệu test thành matrix đầy đủ, không nới validator. Typecheck bắt `exact` không thuộc options của React Testing Library query; dùng regex neo đầu/cuối. JSDOM cảnh báo điều hướng khi mock Next Link chưa ngăn native navigation; bổ sung preventDefault trong mock test, giữ callback thật và kiểm link bằng browser.

## Kiểm tra giao diện và giới hạn

Đã kiểm browser trên production server `http://127.0.0.1:3000`: Owner login→dashboard→menu→profile; link hồ sơ đóng drawer; lưu tên cập nhật heading, thẻ tài khoản và danh sách quản trị; tùy chọn thông báo save đóng dialog/hiện toast, reopen vẫn giữ checkbox Email đã chọn; bộ lọc Khu Đông trả tài khoản đúng phạm vi (kể cả grant toàn HTX); mở account bằng popup; logout về login; tran.binh bị từ chối vì khóa; nguyen.an đăng nhập thành công, menu không có quản trị Owner, hồ sơ đúng username/role/Khu Đông và badge verified. Không đổi mật khẩu trên browser; onboarding/credential/reset được kiểm bằng service/React tests ở trên.

Viewport của lượt kiểm này khoảng 684×378; chưa nghiệm thu riêng 360/1024 px. Tool không cung cấp viewport capability trong tab hiện tại nên không giả nhận đã kiểm hai kích thước đó. Ảnh form lưu/mở lại được giữ local, ignored ở `.hallmark/review-2026-10-27/notification-saved.png`. Có một lần selector getByLabel exact không tìm được select vì label bọc cả options; đọc DOM rồi dùng ID đã quan sát để kiểm bộ lọc thành công. Đây là vấn đề selector kiểm thử, chưa có bằng chứng lỗi điều khiển select thực tế.

Mock giữ state trong RAM theo tab/module. Reload hoặc điều hướng tải lại toàn trang có thể reset phiên/dữ liệu; dùng sidebar và logout trong buổi trình diễn. Không lưu mật khẩu/OTP/JWT vào localStorage để che giới hạn này. Cached mock profile và nhiều tab không có đồng bộ như DB thật. Thu chi/nuôi/thu hoạch/QR, API login/profile/logout và live refresh chưa thuộc phần hoàn tất.

## Tự review

Phát hiện thêm P2 REVIEW-REV-01: `completeStaffOnboarding` ghi state trực tiếp nên phản hồi access-granted sau logout có thể đưa UI trở lại authenticated. Test mới tái hiện trước sửa (expected anonymous, received authenticated). Đã bọc bằng operation tracker hiện có, không đổi nghiệp vụ; 15/15 test AuthProvider + root flows PASS sau sửa. Full kiểm tra cuối chạy lại vì có thay đổi source này; số liệu trước sửa ở bảng trên được giữ như snapshot và kết quả cuối sẽ ghi tiếp bên dưới.

**Sau sửa REVIEW-REV-01:** default `npm test` đạt 140 files PASS/4 SKIP; 1.599 tests PASS/31 Redis SKIP (70,90 giây). Lint và typecheck đã chạy lại PASS. Build cuối PASS với 18/18 trang, static generation 778 ms, không có timeout/retry trang; `npm run test:session-pages` trên build đó PASS đủ 24 assertions.

Kiểm tài liệu cuối: 200 link Markdown local trong README/context/guide/plan/reports và hai mục lục bài học tồn tại, không thiếu đích; `git diff --check` PASS. Bài học và ảnh vẫn ignored, không có learning file tracked. Production server đã mở lại trên loopback port 3000. Thay đổi lượt này chưa commit/push; GitHub CI/GitGuardian chưa được chạy trên một head mới. Giữ nguyên nhánh hiện tại và không merge develop.

Giới hạn mock quyền cần lưu ý khi review: projection hiển thị/dẫn hướng hiện dùng status `effective` trong bản ghi grant như preview sẵn có, chưa có bộ lập lịch đánh giá lại hiệu lực ngày theo thời gian thực hoặc payload quyền backend. Không dùng nó làm bằng chứng authorization thật. Grant editor vẫn thêm/thu hồi theo contract hiện hành; edit trực tiếp grant chờ backend. Các chức năng này không được đánh dấu đã tích hợp chỉ vì tên role đã hiển thị đúng.

Đã rà các điểm nối service/repository, nguồn credential, verified-contact gate, cập nhật version và tách UI khỏi kho mock. Kết quả kiểm thử hiện chưa phát hiện lỗi mới trong các tình huống đã chạy; không khẳng định không còn lỗi. Trước bật API cần hoàn thành G1 runtime, login/hydration/logout và hợp đồng backend còn mở; không nối một nửa API vào các mutation mock. README/guide tiếng Anh; bài học 94–95 tiếng Việt chỉ giữ local trong thư mục đã ignore.

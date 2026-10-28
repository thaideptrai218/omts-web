# Hồ sơ và tùy chọn thông báo: state theo tài khoản — 27/10/2026

> Được review chung lại trong [lượt hoàn thiện28/10](WEB_EVENING_REVIEW_COMPLETION_2026-10-28.md). Số test và câu chưa xuất bản dưới đây là snapshot27/10; xem báo cáo mới cho source được chuẩn bị bàn giao hôm nay.

Tiếp tục P7 của [plan quản trị](../WEB_MANAGEMENT_POLISH_PLAN.md) theo yêu cầu chuyển sang phần khác, để incident GitGuardian xử lý sau. Nhánh `feature/OMTS-132-web-foundation`, baseline b60e9e7; working tree sạch trước lượt này. Không sửa scanner, SRS/Jira/backend; API và refresh vẫn tắt. Chưa commit/push/merge trong lượt này.

## Phạm vi và cách làm

Đọc lại Jira OMTS-201 ACS-05/07 và parent OMTS-118; phần này chỉ ổn định luồng hồ sơ/thông báo hiện có. Không đổi danh mục thông báo, kênh, quyền bắt buộc, email verification, validation, password proof hoặc luật bỏ bản nháp khi đóng form.

ProfileExperience nay chỉ chọn môi trường/service và dựng ProfileWorkspace có key bằng accountId. Workspace chứa state profile/loading/error và một effect duy nhất cho cả tải đầu lẫn retry. Đổi account bỏ workspace cũ ngay; cleanup ngăn kết quả cũ hoặc MSG19 cũ tác động màn mới. Kết quả load có accountId không khớp bị đưa về trạng thái lỗi tải, không render hồ sơ sai. Đây là guard state client, không thay backend authorization/SSR/session policy.

NotificationPreferencesDialog chỉ dựng session con khi open; session có key theo accountId và nhận cùng service/repository đang có. Đóng từ parent hoặc đổi account sẽ bỏ draft và lifecycle cũ, không phụ thuộc việc có bấm nút Đóng trong form. Mỗi effect có scope active riêng; save chụp đúng scope tại lúc submit, rồi kiểm scope sau await/catch/finally trước khi ghi state, phát toast, báo MSG19 hoặc đóng popup. Không tự cancel/rollback service mutation hoặc coi hủy view là hủy ghi dữ liệu.

Giữ pending chặn Escape/Đóng và gửi các lựa chọn editable như cũ. Đã bỏ wrapper changeOpen không còn logic sau khi chuyển reset sang lifecycle; skeleton tôn trọng reduced motion bằng motion-safe. Service notification trong product hiện được giữ ổn định theo account; việc đổi eligibility email vẫn do repository kiểm theo nguồn hiện tại, không tự đổi mặc định kênh.

## Lỗi tái hiện và sửa

| Mã | Trước sửa và nguyên nhân | Bằng chứng sau sửa |
| --- | --- | --- |
| PROFILE-REV-01 / P2 | Đã tải A rồi chuyển sang B đang chờ: state cũ còn nên h1 A vẫn render cùng service mới. Test mong không có A nhưng nhận h1 A | Keyed workspace, skeleton riêng của B; test PASS |
| PROFILE-REV-02 / P2 | Service A trả profile mang accountId B vẫn được render; thiếu kiểm binding | Kết quả sai ID hiện lỗi tải, không lộ B; test PASS |
| PROFILE-REV-03 / P2 | Đường retry dùng async function riêng, không có cleanup. Retry A về sau B làm state trở lại A; MSG19 cũ cũng có thể phát sai | Retry chạy cùng effect có cleanup; case response và expiry cũ đều PASS |
| NOTIFY-REV-01 / P2 | Parent đổi open=false không gọi changeOpen nên draft vẫn còn khi mở lại, kể cả load mới chưa xong | Unmount session khi đóng; mở lại có skeleton và load mới; test PASS |
| NOTIFY-REV-02 / P2 | Save cũ về sau khi đóng/mở lại vẫn gọi onOpenChange(false) và success toast, tác động popup mới | Save kiểm đúng scope captured; test không close/notify popup mới PASS |
| NOTIFY-REV-03 / P2 | Save cũ sau unmount vẫn publish MSG19, có thể ảnh hưởng phiên mới | Scope đã inactive không publish; case current save vẫn publish đúng MSG19 PASS |
| ACCOUNT-REV-04 / P2 | Full rerun phát hiện Escape vẫn đóng account editor trong khoảng service.save đã chạy nhưng pending effect chưa cập nhật parent | Báo pending trực tiếp trước mutation; ref parent chặn close ngay, state vẫn dùng để vẽ UI. Test phát cancel ngay trong service handoff RED trước/GREEN sau |
| NOTIFY-REV-04 / P2 | Kiểm cùng interleaving cho popup thông báo cũng cho phép onOpenChange(false) trước state pending được commit | Scope có cờ saving đồng bộ, gate close và double submit dùng cờ này; case handoff Escape RED trước/GREEN sau |
| DIALOG-REV-05 / P2 | Browser cho thấy đóng notification session bằng unmount làm focus rơi về BODY thay vì nút mở; modal bị gỡ trước khi gọi native close | Dialog thêm layout cleanup gọi close khi node còn connected; test RED trước/GREEN sau, browser kiểm lại riêng |

Lệnh đầu `npx vitest run src/features/profile/components/profile-lifecycle.test.tsx` có **3 FAIL/1 PASS**, đúng ba nhánh lỗi trên. Sau sửa bốn case PASS, bổ sung một case MSG19 retry cũ: tổng **5** case hồ sơ. Lệnh test notification trước sửa có **3 FAIL/4 PASS**; sau sửa và bổ sung case đổi account/retry/current expiry: tổng **11** case notification PASS. Hai case null contact cũ cùng chạy, targeted ba files: **18 PASS**.

Lượt profile test đầu có cold startup khoảng 70 giây, trong đó jsdom environment 55 giây và test body 1,44 giây; không coi đó là lỗi nghiệp vụ hoặc kết luận nguyên nhân hệ điều hành từ suy đoán. Lượt sau cùng file 1,52 giây. Không tăng timeout/bỏ test hoặc sửa máy để che thời gian cold start.

## Tự review và kiểm tra cuối

Đã kiểm source diff: không có HTTP trực tiếp trong component, không thêm storage/token/OTP/password hoặc dependency; accountId mới chỉ là prop nội bộ để reset UI, không thay payload backend. Mutation đã bắt đầu vẫn có thể hoàn thành ở service sau khi view bỏ; UI bỏ qua kết quả cũ không phải đảm bảo rollback.

Lượt full đầu `npm test` **chưa đạt**: 2 files FAIL, 147 PASS, 4 SKIP; 1 testcase FAIL, 1.638 PASS, 40 SKIP, 224,74 giây. Chín testcase bị skip thêm do setup hook lỗi; không gộp chúng với 31 Redis SKIP chủ động.

- `redis-test-command.test.ts`: subprocess `spawnSync node scripts/test-session-redis.mjs` vượt deadline 15 giây, trả ETIMEDOUT thay vì thoát với kết quả invalid-config. Case này cố ý dùng URL sai và mong bốn live suites thất bại ở validation; không cần Redis thật, nên không xử lý bằng cách bật Docker hoặc cấp endpoint.
- `session-cookie-fixture-tooling.test.ts`: beforeAll tải Next/ESLint config qua calculateConfigForFile vượt hookTimeout 10 giây. Log suite khoảng 98,95 giây; không phải assertion lint phát hiện source sai. Hook thất bại làm chín case của suite không chạy.

Để kiểm giả thuyết timeout khởi tạo thay vì thay đổi UI phá test, chạy tuần tự `npm run lint`, `npm run typecheck`, rồi đúng hai test files trên: **tất cả PASS**, hai files/13 cases mất 6,15 giây. Không sửa timeout, bỏ test, đổi worker hoặc thay bất cứ source Redis/tooling nào. Điều này xác nhận lỗi không tái hiện ở lượt kiểm riêng, chưa chứng minh đã sửa nguyên nhân môi trường/cold startup. Đã chạy lại full suite theo cùng cấu hình; các lượt và kết quả cuối ghi bên dưới.

Build/HTTP và browser 360/1024 được chạy tuần tự sau full, tránh cạnh tranh như các lượt đã ghi trước đây. Không coi test promise có kiểm soát là browser account-switch/QA thật.

Full rerun thứ hai đã qua hai mục tooling timeout nhưng phát hiện account pending race thật: **1 FAIL/1.647 PASS/31 SKIP**, 87,11 giây. Không coi đây là cùng lỗi cold startup. Test account cũ chỉ phát Escape sau waitFor nên phụ thuộc thời điểm effect; đã tăng sức kiểm bằng cancel ngay lúc service.save được gọi. Kiểm riêng trước sửa vẫn FAIL, sau sửa PASS mà không thêm wait hoặc nới assertion.

AccountEditor nay báo onPendingChange(true/false) ngay tại đầu/finally các mutation thay vì dùng passive effect. Parent có ref cập nhật đồng bộ và kiểm trong onOpenChange; dismissible từ state vẫn phục vụ giao diện. Áp dụng cùng nguyên tắc cho popup thông báo qua cờ saving trong scope. Không đổi trạng thái nghiệp vụ, payload hoặc API. Targeted ba files hồ sơ/thông báo/account pending sau hai sửa race: **17 PASS**, 6,53 giây. Lượt kiểm cuối chạy đúng thứ tự lint→typecheck→full test→build→HTTP.

Lượt kiểm sau race đã đạt full **1.648 PASS/31 Redis SKIP**, 86,99 giây; lint/typecheck/build 18/18 (static 777 ms)/24 HTTP assertions PASS. Browser 360 px tiếp đó phát hiện focus BODY sau Escape, nên chưa dùng kết quả này làm bằng chứng source cuối: đã thêm cleanup native dialog và một regression case mới. Unit case kiểm close được gọi lúc node còn connected (trước sửa 0 calls, sau sửa phải 1); không dùng jsdom để tuyên bố đã đo focus native. Lint từng bắt prefer-const trong test handoff; đã dùng const với closure được gọi sau khai báo, không thay timing/assertion.

## Kết quả source cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Regression popup/notification/account/employee unlink/role | 5 files, **38 PASS** sau sửa cleanup native |
| Full suite cuối | 149 files PASS, 4 SKIP; **1.649 tests PASS, 31 Redis SKIP**, 92,04 giây |
| Lint / typecheck | PASS |
| Production build | PASS 18/18 trang, static generation 712 ms |
| HTTP smoke | PASS 24 assertions trên build cuối |
| Browser | Các thao tác mô tả dưới đây PASS ở 360/1024 px |

Thêm 14 case so với baseline 1.635; ngoài ra tăng sức kiểm case account pending hiện có để tái hiện khoảng trễ effect một cách ổn định. Không thêm dependency hoặc nới cổng test. Các lượt timeout ban đầu vẫn là rủi ro tooling cần theo dõi, không được tuyên bố đã sửa vĩnh viễn bởi rerun xanh.

## Browser trên bản cuối

Đăng nhập Owner mock, đi từ menu tới hồ sơ, mở thông báo và quan sát skeleton trước matrix. Mandatory In-app vẫn bật/khóa, Push/Zalo có lý do không khả dụng. Bật Email của Đơn hàng mới rồi Escape: popup đóng, khóa cuộn được nhả, **activeElement là BUTTON Tùy chọn thông báo** (trước sửa là BODY). Mở lại thấy Email vẫn tắt: draft chưa lưu đã bị bỏ.

Bật Email và Lưu: pending khóa controls, success đóng popup, toast xác nhận được lưu và focus trả về nút mở. Mở lại ở 1024 px thấy Email đã bật. Sau kiểm đã lưu trả Email về tắt, không giữ thay đổi test trong demo. Chưa gửi email/push hoặc gọi backend thật.

Ở 360 px, popup clientWidth/scrollWidth cùng 328; trang khi đóng popup là 345/345. Ở 1024 px, popup 751/751; root scrollWidth 1009 không vượt clientWidth 1024 khi khóa. Không tràn ngang trong các trạng thái đã kiểm. Ảnh local ignored: `.hallmark/polish-2026-10-27/notification-lifecycle-360.png` và `notification-lifecycle-1024.png`.

Đã đi luồng thật Owner→logout→login bằng Staff nguyen.an→hồ sơ: tên Nguyễn Văn An, username nguyen.an, Quản lý vùng/Khu Đông; không còn h1 Lê Minh Hải. Popup Staff chỉ có công việc/nhắc hạn/cảnh báo nước; không có field Đơn hàng mới của Owner. Đây là browser chuyển tài khoản bình thường; các race response cũ/sai accountId và retry lỗi là evidence riêng của unit tests.

Kết thúc đã logout Staff, trở lại hồ sơ Owner, khôi phục viewport ban đầu và giữ tab review tại `/account`; server local `http://127.0.0.1:3000` đang chạy. Không đổi mật khẩu, email/SĐT, grant hoặc nhân viên khi kiểm browser. Chưa nghiệm thu Safari/iOS, bàn phím ảo, API/QA hoặc mạng bất ổn thật.

## Giới hạn còn chờ

GitGuardian incidents được để sau theo yêu cầu; không thay trạng thái trên dịch vụ. Phạm vi API hồ sơ, MSG06 thật thiếu structured metadata, refresh và các quyết định backend/BA chưa chốt vẫn giữ nguyên. Không làm thêm Customer/đơn hàng/QR/nuôi trồng hoặc nghiệm thu Jira từ số test.

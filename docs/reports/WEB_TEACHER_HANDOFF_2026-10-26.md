# Chuẩn bị bản Web để giảng viên tải về review

Ngày 26/10/2026. Nhánh `feature/OMTS-132-web-foundation`; không merge `develop`. Phạm vi bàn giao là Web UI dùng mock và các lớp chuẩn bị BFF, không phải bản nghiệm thu API thật.

## Các việc đã chuẩn bị

- README tiếng Anh, hướng dẫn Node24, đúng nhánh, npm ci, file môi trường mẫu, cổng chạy, tài khoản demo và troubleshooting.
- [Hướng dẫn reviewer](../REVIEW_GUIDE.md) bằng tiếng Anh, có thứ tự kiểm tra Owner/Staff/Sysadmin, dialog, draft, unlink, quyền và logout.
- Gom các phần đã triển khai từ trước: theme xanh biển, UI nhân viên và regression tests, session/Redis/transport/cookie/CSRF/expiry/SSR guards và service login độc lập. Không tự mở rộng thành login/profile/logout API thật.
- Giữ `OMTS_DATA_SOURCE=mock`; không đưa `.env.local`, khóa, bài học local, ảnh review, node_modules hoặc output Next vào source bàn giao.

## Kiểm tra như một máy mới

Xuất toàn bộ Git index sang thư mục tạm sạch bằng `git checkout-index --all --prefix=...`. Bản kiểm tra không dùng node_modules, `.next` hoặc `.env.local` của checkout đang làm việc; tạo cấu hình từ `.env.example` rồi chạy npm ci. Tất cả554 URL package resolved trong lockfile trỏ tới registry.npmjs.org; không phụ thuộc registry nội bộ của máy agent.

Các lệnh kiểm tra chạy tuần tự trong bản xuất này: npm ci → lint → typecheck → npm test → build → test:session-pages. **Đều PASS:** npm ci audit0;1448 tests PASS/31 Redis SKIP,126 files PASS/4 SKIP; build18 routes và24 HTTP assertions PASS. Node24/npm11. Đây là bằng chứng cài sạch từ index, không gọi là clone remote hoặc GitHub CI. Không chạy lại các fixture compiler/Redis/TLS riêng trong lượt này.

Đã chạy npm run dev trên bản sạch tại cổng3100: login HTTP200; browser Owner login→employees→editor dialog; logout→login; Staff login với menu không có Owner items. Mở lại /employees bằng navigation toàn trang trả về login vì session mock không persist qua reload. Không gọi kết quả đó là kiểm quyền Staff ở server thật. Chưa kiểm lại toàn bộ scenario của REVIEW_GUIDE bằng browser trong lượt này; regression suite và evidence chi tiết từng module nằm ở các báo cáo trước.

## Lỗi/cảnh báo và cách xử lý

- `git rev-list HEAD...origin/feature/...` ban đầu lỗi unknown revision dù fetch thành công. Clone này chỉ cấu hình refspec theo dõi develop, nên fetch branch riêng ghi FETCH_HEAD mà không tạo remote-tracking ref tương ứng. So HEAD với FETCH_HEAD nhận0/0: cùng4555c32, không có thay đổi remote cần tích hợp. Không force push hoặc reset working tree.
- `git diff --cached --check` bắt thêm dòng trắng cuối fixture serialization trước đây chưa track. Đã bỏ dòng trắng và đưa import về đầu file; không đổi hành vi fixture.
- npm ci thành công, audit0 nhưng cảnh báo eslint9.39.5 đã hết hỗ trợ. Chưa nâng major ngay trước buổi review; ghi nhận việc bảo trì riêng. Không coi cảnh báo này là lỗi cài dependencies hoặc bỏ qua lỗi lint.
- **HANDOFF-01/P3 còn mở:** Next dev hiện Instant Navigation diagnostic: segment /employees bị bỏ qua khi validation đi qua session boundary. Đây là thông báo dev-only, không phải browser crash hoặc lỗi build. Đã đọc docs local Next16.4 về instant validation; chưa đổi cacheComponents/partialPrefetching hoặc render dữ liệu qua guard để né cảnh báo. Hướng dẫn reviewer dùng build/start cho presentation, dev vẫn dùng để code; giải quyết contract instant/static shell ở task riêng. Không tuyên bố browser dev console không có lỗi.
- Lần đầu công cụ mở tab test bị timeout; server log và HTTP probe xác nhận /login200, sau đó lấy lại đúng tab4 đã tạo và tiếp tục, không tạo tab trùng hoặc kết luận server hỏng.

## GitHub checks và sửa lỗi sau push

PR draft: [#3](https://github.com/thaideptrai218/omts-web/pull/3), chưa merge. Lần CI đầu ở head a743f32 cho thấy local PASS không thay cho Linux CI:

- **HANDOFF-02/P2 — đã sửa:** build-test thất bại ở csrf-guard-lifecycle, buffered body vẫn allowed khi abort cùng lúc. Promise.race có thể chọn reader.read đã fulfilled trước promise abort cũng đã settled. Reader nay kiểm request.signal.aborted ngay sau mỗi await, kể cả nhánh done. Test kiểm soát thứ tự promises tái hiện RED trong bản xuất sạch trước sửa, rồi chạy lại với code mới. Không nới assertion/tăng timeout hoặc bỏ test Linux.
- **HANDOFF-03 — false positive Gitleaks đã xác minh:** finding từ commit79066ed… là bảng ký tự công khai của bộ sinh mật khẩu mock bằng crypto.getRandomValues, không phải API key hay mật khẩu. .gitleaksignore chỉ chứa đúng fingerprint commit/path/rule/line đó, theo cơ chế chính thức; không bỏ rule generic-api-key hoặc ignore thư mục tests. Source hiện tại đã chuyển khỏi hằng lịch sử này từ trước, xóa file hiện tại cũng không làm biến mất finding lịch sử.
- **GitGuardian còn cần chủ repo phân loại:** check báo5 Generic Password findings ở các commit cũ. Đã đọc nguồn: hai case password schema test (incident38275825/38275826), mock auth test (38252611), alphabet generator mock (38314032), credential giả của provisioning mock (38314033). Chúng là dữ liệu test/mock; không có backend credential được chứng minh bị lộ trong các finding này. Đây là kết luận review source, không tự chuyển trạng thái incident trên dịch vụ. Không rewrite lịch sử, tắt app hay tự ghi status success. Chủ repo cần xem [GitGuardian dashboard](https://dashboard.gitguardian.com) và xác nhận false positive nếu đồng ý phân loại.

Build-test, gitleaks và pr-title phải xem lại trên đúng head sau commit sửa; GitGuardian được báo riêng, không gọi toàn bộ CI xanh khi check đó còn fail. Ghi chú counts1448 phía trên là snapshot trước regression case mới; kết quả lượt kiểm cuối được ghi ở cuối báo cáo.

## Giới hạn của bản review

Authentication và dữ liệu màn hình hiện dùng mock, không gửi SMS/email thật, không phải dữ liệu backend/QA. Nhiều thay đổi và phiên mock mất khi reload. Live refresh và employee HTTP/BFF adapter chưa bật; MSG06 thật vẫn chờ metadata. QR và các nghiệp vụ vận hành chưa có không được mô tả là hoàn thành. Không chuyển Jira Done theo số test xanh.

Ghi chú học về cài sạch/Git index ở bài90, chỉ local theo gitignore. Không thay lịch sử các báo cáo trước bằng kết quả lượt này.

## Nơi tải bản review

- Nhánh: [feature/OMTS-132-web-foundation](https://github.com/thaideptrai218/omts-web/tree/feature/OMTS-132-web-foundation).
- [Tải ZIP của nhánh review](https://github.com/thaideptrai218/omts-web/archive/refs/heads/feature/OMTS-132-web-foundation.zip). Nhánh develop chưa nhận các thay đổi này.
- Commit chia theo nhóm chức năng: BFF/session foundation; employee unlink/draft; theme và tài liệu bàn giao. Không tách branch mới hoặc merge develop.
- Kết quả ở trên là local. GitHub checks cần xem trên PR gắn với đúng commit sau push; không suy CI xanh từ npm test trên máy.

## Kiểm tra local cuối sau bản sửa CI

Đã cập nhật hai file CSRF vào bản xuất sạch đang có dependencies từ npm ci và chạy lại tuần tự lint/typecheck/full test/build/test:session-pages: **1449 tests PASS,31 Redis SKIP;126 files PASS/4 SKIP; build PASS và24 HTTP assertions PASS**. Không cài lại dependencies vì package/lockfile không thay đổi. Test thứ tự buffered read mới đã chứng minh RED với source trước sửa và GREEN sau sửa; API/refresh không được bật.

PR vẫn draft. Gitleaks exception là một fingerprint đã review; GitGuardian5 incidents cần chủ repo phân loại riêng. Hướng dẫn tải và chạy không phụ thuộc việc merge PR này vào develop.

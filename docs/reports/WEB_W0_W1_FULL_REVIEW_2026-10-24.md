# Review toàn bộ Web W0–W1 — 24/10/2026

Repo `omts-web`, nhánh `feature/OMTS-132-web-foundation`, baseline `5ae1b665594bf2c7d664c059dcd39d48051c717b`. Review cả thay đổi tracked lẫn file mới từ audit/W0/W1, không chỉ phần mapper cuối. Theo yêu cầu Duy Thái: cập nhật báo cáo, commit/push nhánh hiện tại; không merge hoặc push vào `develop`.

> **Cập nhật sau review:** Duy Thái yêu cầu sửa WREV-02; [bản vá CI và kết quả kiểm tra](WEB_CI_TEST_GATE_REVIEW_2026-10-24.md) đã thêm `npm test`. Finding thiếu test step được giải quyết trong cấu hình nhánh; các nhận xét “còn mở/chưa sửa workflow” bên dưới là snapshot của lượt review trước bản vá, không phải trạng thái cấu hình mới. GitHub runner vẫn chưa được xác nhận chạy bản vá; không thay các cổng QA/API.

## 1. Kết luận

Phần chuẩn bị W0–W1 đã triển khai có thể bàn giao trên nhánh feature: dependency patch, wire schemas, lỗi HTTP theo context, profile mapper và permission projection có test độc lập. Đợt review này chưa phát hiện thêm lỗi logic ứng dụng trong phạm vi đã đọc/kiểm thử; không có sửa runtime mới trong riêng lượt review này. Không coi kết luận đó là bảo đảm không còn lỗi.

**Chưa hoàn thành toàn bộ W0/W1:** W0.5 thiếu QA fixtures; W1.2 phần MSG06 chờ backend trả đủ structured `user_name`/`time` theo quyết định đã chốt. Web vẫn mock, chưa có BFF store/server authorization và chưa chạy vòng login → profile → logout thật. Các cổng này không được đóng bằng số unit tests.

## 2. Phạm vi và cách review

Đã đọc lại plan, decision register, reports trước, production code và các tests liên quan; so sánh diff với baseline và lần theo các nơi sử dụng HTTP client/mapper. Backend contract dùng snapshot `48ae1e0438cec5d1123e7f7f6726377242855ce5` đã audit, không xác nhận lại deployment/backend mới trong lượt này. Không gọi mutation backend hoặc thay dữ liệu account.

Review theo các micro-task sau:

1. **W0:** package/lock diff, versions đang cài, security audit, môi trường và giới hạn QA; giữ nguyên patch scope, không `audit fix --force`.
2. **W1.1:** schema request strict/response strip, GUID/actor/gate, timestamp, contacts null, update envelope và additive fields; kiểm tra request không trim password hoặc nhận field mutation ngoài contract.
3. **W1.2:** lỗi mạng, HTTP status thật, ProblemDetails malformed/HTML, JSON suffix, abort/body-read, context login/protected/refresh, observer isolation, retry metadata và MSG06 thiếu params. Không tự retry hay bật refresh.
4. **W1.3:** account binding, Unicode, opaque version, contact null/verified mâu thuẫn, grant scope, clone mock và render ProfileEditor. Không dùng role label làm quyền hoặc bịa liên hệ.
5. **W1.4:** unknown function/action/scope, Owner flag/gates, grant × summary, action-specific scope, merge cùng dataScope, cooperative-wide restrictions, navigation-only keys và helper nhiều grants/scope rỗng.
6. **Bàn giao:** trạng thái tài liệu, ignore learning, file diff/staging, kiểm tra nhánh/remote và các giới hạn CI.

Đối chiếu lockfile cũng tìm thấy thay đổi gián tiếp `@oxc-project/types` 0.154.0 →0.155.0 qua Vitest → Vite → Rolldown; đã bổ sung vào report dependency để không mô tả cả toolchain là patch-only. Không thay package/lock thêm trong lượt review. Có 11 literal dạng credential ở added lines, tất cả nằm trong bốn test files dùng giá trị fixture giả đã đọc, không phải tài khoản/token backend.

Không cần đọc lại Figma để xác nhận transport/domain trong lượt này: không thiết kế màn mới và không thay luồng nghiệp vụ. Nguồn Jira/SRS đã đối chiếu trong audit trước được giữ dưới dạng snapshot; không cập nhật Jira/SRS và không coi trạng thái ticket là bằng chứng API hoàn tất.

## 3. Findings và hướng xử lý

### WREV-01 — P3: trạng thái tài liệu mâu thuẫn, đã sửa

Mở đầu plan API vẫn nói tất cả bước triển khai “chưa làm” trong khi checklist đã ghi W0.4/W1.1/W1.3/W1.4 có code/test. Context lịch sử cũng dùng chữ “current baseline” cho 251 tests. Người đọc có thể hiểu sai tiến độ hoặc bỏ qua công việc đã làm.

Đã sửa header plan để dẫn về checklist thực tế, gắn báo cáo review vào README/context/plan, đánh dấu baseline 22/10 là lịch sử và chỉ rõ decision register hiện hành. Không sửa lịch sử bằng cách biến kết quả cũ thành kết quả mới; không đánh dấu QA/MSG06 hoàn tất.

### WREV-02 — P2: CI chưa thực thi bộ regression tests, còn mở

`.github/workflows/ci.yml` có `npm ci`, lint, typecheck và build nhưng **không có `npm test`**. Vì vậy một thay đổi làm sai mapping mà vẫn đúng kiểu có thể qua workflow. Cả CI và secret scan hiện chỉ trigger push `main`/`develop` (hoặc PR theo cấu hình); push nhánh feature riêng không tự chạy hai workflow đó.

Đề xuất một task riêng thêm `npm test` vào CI và thống nhất thời điểm chạy trên nhánh/PR với nhóm. Chưa sửa workflow hoặc mở PR trong lượt review này. Bộ tests đã chạy local; không báo GitHub CI xanh khi chưa có run tương ứng. Đây là khoảng trống quy trình xác minh, không phải lỗi mới của mapper.

### Các giới hạn đã biết — không phải quyết định mới

- **Release gate:** client-only guard/mock session hiện không đủ bảo vệ dữ liệu API thật. W2 phải có server-only transport/DAL, session store, cookie/CSRF, cache isolation, allowlisted URL và xử lý race trước activation. HTTP client có event channel phía client không được tái sử dụng thành singleton auth phía server.
- **W0.5:** Owner bootstrap còn gate; Staff QA chờ backend cung cấp. Không tự tạo Staff, đổi password Owner hoặc sửa cờ verified để lấy E2E xanh.
- **W1.2/MSG06:** parser giữ wire code/version, nhưng thiếu params thì `appMessage` hiện là MSG04. Đây là giới hạn của transport chưa ghép API, không phải UX conflict đã được duyệt; không thêm câu dự phòng, parse detail hay bịa người sửa/thời gian.
- **W1.4:** catalog là snapshot, không phải default role matrix BA đã duyệt. OwnRecords giữ riêng; chưa định nghĩa ownership theo entity. Platform provisioning chưa có binding; dashboard navigation chỉ cho thấy trang, không cho phép lấy mọi KPI. Không nối projection vào mock menu hay cấp rộng quyền để demo.
- **Quyết định cần trước activation:** store/deployment, refresh-Web, phạm vi profile API đầu, API-mode contact/security, Owner forced-password và khác biệt Staff email-OR-phone/phone-only, logout offline/mất phản hồi. Xem [decision register](../decisions/OPEN_QUESTIONS.md).

## 4. Bằng chứng kiểm tra mới trong lượt review

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | PASS — 69 files, 401/401 tests, Vitest 4.1.12 |
| `npm run lint` | PASS — exit 0, không warning |
| `npm run build` | PASS — Next.js 16.4.3, compile/TypeScript/prerender đạt |
| `npm run typecheck` sau build | PASS — route typegen + tsc exit 0 |
| `npm audit --json` | PASS — exit 0, vulnerabilities `{}`, total 0 tại thời điểm chạy |
| `npm ls next eslint-config-next vitest @vitest/mocker --depth=1` | PASS — Next/eslint 16.4.3, Vitest/mocker 4.1.12 |

Tests dùng fixtures/fake fetch và hai React SSR render cases; không phải browser E2E hoặc live API tests. Không có coverage percentage vì không chạy coverage instrumenter. Không chạy lại `npm ci` trong lượt review này; tree đang cài, lock diff, npm ls, tests và production build là bằng chứng đã dùng.

Không restart dev server port3000, không chạy QA responsive 360/1024 mới. Cảnh báo Windows SWC cleanup EPERM trước đó không lặp lại qua install trong lượt này vì không chạy install; không thể kết luận file lock cũ đã được giải quyết. Xem [report dependency/error](WEB_API_W0_W1_SECURITY_SCHEMA_ERRORS_2026-10-24.md) cho lệnh, nguyên nhân và giới hạn.

## 5. Kiểm tra bàn giao và giới hạn bảo mật

Đã kiểm tra `git diff --check`, các link Markdown nội bộ trong tập tài liệu thay đổi, danh sách file staged và các pattern secret phổ biến trong added lines. Không đưa `.env`, token thật, credentials backend, tài liệu học local hoặc build artifacts vào staging. `docs/learning/` tiếp tục ignored và không có file được tracked.

Máy local không có `gitleaks`; kiểm tra pattern/manual không thay thế scanner chuyên dụng hoặc chứng minh không còn secret. Secret-scan workflow có sẵn nhưng feature push này không tự kích hoạt nó. Không in giá trị nghi là secret trong output và không xem secret store backend để review.

Remote trước bàn giao: feature tại `5ae1b665594bf2c7d664c059dcd39d48051c717b`, `develop` tại `b1a6c2269ab4878b879d69044572b83b26f03b9a`. Commit bàn giao gồm các thay đổi W0–W1 đã tích lũy và tài liệu review; SHA/push result xác nhận bằng Git sau commit, không tự điền SHA dự đoán vào tài liệu. Chỉ push nhánh hiện tại, không force-push, không merge/rebase/cherry-pick sang develop, không mở PR hoặc đổi Jira trong lượt này.

## 6. Tự đánh giá và bước tiếp theo

Chất lượng phần chuẩn bị đủ để review/tiếp tục thiết kế W2 trong phạm vi đã được duyệt: code nhỏ theo trách nhiệm, unknown ở ranh giới, fail-closed mapping, tests negative cases và metadata không lẫn copy UI. Mức sẵn sàng là **contract/mapper snapshot đã kiểm tra**, không phải “web API thật đã xong”.

Tiếp theo cần chốt store/deployment trước runtime W2; backend bổ sung MSG06 và QA accounts song song. Khi có nguồn được xác nhận, kiểm tra contract revision lại rồi mới ghép login cùng logout, sau đó profile. Refresh live không tự bật. WREV-02 nên xử lý trước khi dựa vào CI để nghiệm thu tích hợp; thay đổi đó không cần quyết định nghiệp vụ nhưng vẫn là task triển khai riêng.

# WREV-02 — sửa test gate CI và review workflow

Ngày 24/10/2026, Asia/Saigon. Repo `omts-web`, nhánh `feature/OMTS-132-web-foundation`, baseline `0d977a0b0cb30d19a9744260e0bf5fa295121660`. Duy Thái yêu cầu sửa P2, kiểm tra workflow, tự review, cập nhật báo cáo và commit/push nhánh hiện tại; không merge develop.

## 1. Kết quả và phạm vi

**WREV-02 đã sửa ở cấu hình nhánh:** `.github/workflows/ci.yml` thêm đúng một dòng `- run: npm test` sau typecheck, trước build. Chuỗi run hiện là `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.

`package.json` đã có `test: vitest run`, nên không cần sửa script hoặc cài thêm package. Tests chạy một lần thay vì giữ process watch. Step không có điều kiện skip hoặc `continue-on-error`; lỗi test sẽ làm job không thành công, không tiếp tục build theo điều kiện mặc định. Giữ tên job `build-test` để không làm lệch required-check name hiện có.

Không đổi trigger, concurrency, runner, Node version, quyền token, action references, workflow release/secret scan/PR title hoặc branch protection. Không thay code sản phẩm, nghiệp vụ, backend, Mobile, dependency/lockfile, Jira hay SRS. Bản vá không giải quyết các cổng BFF/MSG06/QA còn mở trong plan API.

## 2. Context → Design → Code

Lint tìm các vấn đề quy tắc code; typecheck tìm sai kiểu; build kiểm tra khả năng đóng gói. Một hàm tính sai vùng được phép vẫn có thể vượt qua cả ba bước. Vì vậy CI phải gọi bộ regression tests có sẵn thay vì chỉ đặt tên job là “build-test”.

Chọn thêm step độc lập thay vì nối nhiều lệnh vào build script: GitHub log phân biệt bước nào hỏng, local `npm run build` không bị thay nghĩa, và không tạo một bộ lệnh test riêng dễ lệch giữa máy phát triển với runner. Đặt trước build để không đóng gói khi test đã thất bại; không dùng `--passWithNoTests` hoặc bỏ qua mã thoát.

Đã đọc lại Jira `OMTS-132` (Done) và parent `OMTS-121` (In Progress). Đó là trạng thái quản lý, không chứng minh API thật hoàn tất; không chỉnh sửa ticket. Đã đọc hướng dẫn Vitest và CI của Next.js đang cài trong `node_modules/next/dist/docs/01-app/02-guides/`. Không cần Figma/SRS screen review mới vì chỉ sửa quality gate, không đổi màn hoặc luồng.

## 3. Kiểm tra các workflow

- **CI:** PR target `main`/`develop`, push hai nhánh đó; `contents: read`; Node theo `.nvmrc` =24; job, cache npm và concurrency không đổi. `package.json` hiện dùng Vitest4.1.12, local Node24.13.1.
- **Secret scan:** giữ checkout lịch sử và gitleaks action như cũ, không thêm quyền hoặc skip. Không coi parse YAML thành công là đã chạy secret scanner.
- **PR title:** giữ `pull_request_target`; workflow không checkout code PR, chỉ dùng action kiểm tra title. Không sửa event hoặc mở rộng thực thi mã không tin cậy.
- **Release:** vẫn chỉ push tag `v*`, lệnh tạo release không đổi; task này không tạo tag/release.

Parser `js-yaml`4.3.2 đã có trong dependency tree được dùng đọc cả bốn YAML; không cài thêm dependency. So sánh object YAML với baseline bằng assertion xác nhận chỉ chèn đúng bước test, các trường khác giữ nguyên. Assertion kiểm tra thứ tự run, đúng một test step, không skip/ignore lỗi, script non-watch. Hai fixtures sai (xóa test step; thêm `continue-on-error: true`) đều bị assertion từ chối như mong đợi. Đây là kiểm tra cấu trúc chạy tạm, không thêm test file hoặc nâng số test ứng dụng.

## 4. Bằng chứng mới và tự review

| Kiểm tra | Kết quả |
| --- | --- |
| YAML parse và cấu trúc cơ bản | PASS — cả 4 workflows |
| So sánh exact-change + thứ tự + fail gate | PASS |
| Hai fixtures cấu hình sai | Được từ chối đúng, không phải lỗi ứng dụng |
| `npm test` | PASS — 69 files/401 tests, Vitest4.1.12 |
| `npm run lint` | PASS — exit0 |
| `npm run typecheck` | PASS — route typegen + tsc |
| `npm run build` | PASS — Next16.4.3, compile/types/prerender đạt |

Không có lỗi test/lint/typecheck/build mới; không cần sửa code sản phẩm để làm CI xanh. Review diff xác nhận workflow chỉ thêm một step, không có lệnh ép exit0 hoặc che lỗi. Các tài liệu hiện hành đã cập nhật; báo cáo W0–W1 giữ findings lịch sử và có ghi chú follow-up, không xóa bằng chứng cũ. Tài liệu học bài65 vẫn ignored/local.

## 5. Giới hạn xác minh và bàn giao

Preflight `gh pr list` cho nhánh hiện tại trả `[]`. Feature push không có PR target phù hợp không thuộc trigger CI đang giữ. Vì vậy **đã sửa và kiểm tra local**, chưa tuyên bố GitHub Actions chạy xanh. Không tự mở PR, thêm `workflow_dispatch`, mở rộng push trigger hoặc push develop chỉ để có CI run. Khi nhóm mở/cập nhật PR, cần kiểm tra run của đúng commit trên GitHub runner.

Không chạy `npm ci` mới hoặc full Linux runner trong lượt này; kiểm tra trên Windows với dependency tree đã cài. Không có actionlint/gitleaks local; YAML parsing + assertions + manual review không thay thế kiểm tra toàn bộ GitHub Actions schema/runtime hoặc secret scan chuyên dụng. Không chạy audit mới vì không đổi dependencies; kết quả audit trước thuộc report W0–W1.

Trước commit kiểm tra diff whitespace, link tài liệu, staging đúng file và không có learning/.env/artifact. Baseline remote feature `0d977a0`, develop `b1a6c2269ab4878b879d69044572b83b26f03b9a`; chỉ commit/push nhánh feature, không force-push, tạo PR, merge hoặc cập nhật Jira. SHA commit và remote được xác nhận sau push qua Git, không điền SHA phỏng đoán vào báo cáo.

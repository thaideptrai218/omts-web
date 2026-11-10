# 07 — Script, CI, test, chạy local

## Script npm
| Script | Làm gì |
| --- | --- |
| `dev` | `next dev` (mặc định mock, đọc `.env.local`) |
| `build` / `start` | `next build` / `next start` |
| `dev:api` | `node scripts/run-api.mjs`: nạp `.env.api.local`, yêu cầu `OMTS_DATA_SOURCE=api`, yêu cầu `OMTS_WEB_ORIGIN` http localhost/127.0.0.1, chạy `next dev` trên `127.0.0.1` ở cổng của origin (mặc định 3002) |
| `start:api` | Như trên với `--production`; đặt `NODE_ENV=test` chỉ cho launcher http loopback, chạy `next start` |
| `setup:api` | `scripts/setup-api-local.mjs` ghi `.env.api.local` bị ignore (tạo độc quyền, giữ file có sẵn): API base `http://127.0.0.1:8080`, timeout 5000, origin `http://localhost:3002`, profile `http-loopback-dev`, keyring ngẫu nhiên mới, Redis `redis://127.0.0.1:6380/1`, namespace `omts-web-api-local`, idle TTL 1.800.000, pending 120.000. Không in khóa |
| `lint` | `eslint src scripts tests/fixtures/cookie-browser --max-warnings=0` |
| `typecheck` | `next typegen && tsc --noEmit` |
| `test` | `vitest run` (336 file, ~1.953 lệnh test đếm tĩnh); suite tích hợp bỏ qua khi thiếu `OMTS_TEST_REDIS_URL` |
| `test:redis` | Chạy 4 file tích hợp Redis; fail nếu thiếu `OMTS_TEST_REDIS_URL` (Redis test riêng ≥ 6.2) |
| `test:session-pages` | Cần build. Chạy app đã build trên cổng trống ở chế độ API không Redis với backend giả (`https://not-called.invalid`), kiểm hành vi HTTP của trang/route; cũng chạy kiểm style sidebar trong `scripts/lib` |
| `test:boundary` | Build 6 app fixture cô lập bằng Turbopack và Webpack import module server vào client; mỗi build phải fail với lỗi `server-only` |
| `test:serialization` | Build `tests/fixtures/serialization`, quét output tìm canary bí mật (`canaries.mjs`); `OMTS_TEST_UNSAFE_DTO=1` là ca âm tính phải bị từ chối |
| `test:cookies` / `test:cookies:serve` | Build và chạy `tests/fixtures/cookie-browser`, kiểm cookie qua HTTP thật (`cookie-fixture-checks.mjs`: không phát cookie ở GET/OPTIONS, 405 kèm `Allow`, không CORS, no-store); `serve` chạy để kiểm tay với SID giả |
| `test:api-roles` | `scripts/test-api-role-matrix.mjs`: kiểm ma trận vai trò chỉ đọc trên Web API local (cần `OMTS_QA_PASSWORD`); xác nhận không có `accessToken`, `refreshToken`, `passwordHash` trong phản hồi và header `no-store`. Env: `OMTS_QA_WEB_ORIGIN`, `OMTS_QA_BRANCH_API`, `OMTS_QA_REPORT`, `OMTS_QA_SALES_WORKFORCE` |

## Script QA/demo (không nối npm)
- `check-meeting-api.mjs`, `check-meeting-admin.mjs`: kiểm sẵn sàng chỉ đọc cho owner, zone-manager, accountant và sysadmin vs owner trên route admin.
- `prepare-meeting-demo.mjs`, `prepare-meeting-purchasing-demo.mjs`: ghi dữ liệu demo (cần `--write-demo`, localhost:3002 và DB họp).
- `seed-meeting-sysadmin.mjs`: chỉ QA local; chèn `sysadmin` vào `OMTS_MEETING_20261106` qua docker SQL Server; cần `--write-demo`.
- Các script họp có mật khẩu demo mặc định trong source; tài liệu này không chép lại.

## CI (`.github/workflows`)
- `ci.yml`: trên PR và push vào `main`, `develop`; ubuntu-latest; Node theo `.nvmrc`; cache npm. Bước: `npm ci`, `lint`, `typecheck`, `test`, `build`, `test:session-pages`. Nhóm concurrency hủy lần chạy đang dở cùng ref. Quyền `contents: read`.
- `gitleaks.yml`: quét bí mật trên PR và push vào `main`, `develop`, toàn lịch sử (`fetch-depth: 0`); action ghim theo SHA; `.gitleaksignore` ghi một false-positive đã duyệt.
- `pr-title.yml`: `pull_request_target` kiểm tiêu đề PR semantic (amannn/action-semantic-pull-request ghim SHA); không checkout code PR.
- `release.yml`: khi tag `v*`, chạy `gh release create` với release notes sinh tự động.
- CI **không** chạy `test:boundary`, `test:serialization`, `test:cookies`, `test:redis`; chỉ `test:session-pages` là kiểm kiểu fixture. Bảo vệ nhánh theo `AGENTS.md`: tách từ `develop`, PR vào `develop`.

## Bố cục test
336 file test đặt cạnh source dạng `*.test.ts(x)` và `__tests__`. 7 file `*.integration.test.ts` dùng Redis thật (`OMTS_TEST_REDIS_URL`). Còn test hợp đồng (`session-store.contract.test.ts`, `login-ledger.contract.test.ts`), test HTTP với fetch giả (`*.http.test.ts`), test pipeline serialize (`backend/serialization-pipeline.http.test.ts`), và `scripts/lib/check-sidebar-styles.test.mjs`.

## Chạy local
- **Mock (mặc định)**: sao chép `.env.example` → `.env.local`, giữ `OMTS_DATA_SOURCE=mock`, `npm ci`, `npm run dev`, mở `http://localhost:3000/login`. Không cần backend, DB, Redis. Tài khoản mock: `owner`, `manager`, `manager2`, `ketoan`, `trader`, `sysadmin`; mật khẩu demo xem `README.md`.
- **API**: chạy backend (tài liệu nhắc API trên 8080/8081/8082), chạy Redis ≥ 6.2 (mặc định local cổng 6380), rồi `npm run setup:api`, `npm run build`, `npm run start:api` (hoặc `dev:api`); mở `http://localhost:3002/login`. Tên đăng nhập seed API trong `README.md`.
- Không chạy `dev` và `build` cùng lúc trong một checkout (dùng chung `.next`).

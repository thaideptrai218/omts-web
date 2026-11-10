# 02 — Cấu trúc thư mục

```
src/app/                  Route Next
  (public)/               landing, origin/[qrToken] (QR công khai), origin/photo (proxy ảnh),
                          dev/security, dev/verification
  (auth)/                 login, register, recover, onboarding, session (recover)
  (app)/                  khu có bảo vệ: access, account, audit, cooperative, dashboard, employees,
                          farming (cycles/rafts/zones), notifications, operations, system,
                          trader-requests, workspace/[resource]
  api/                    BFF Route Handlers (xem 04)
src/components/           brand, feedback (BootScreen), form, layout, security, ui (toast, dialog…)
src/features/<name>/      một thư mục mỗi feature (~50–58): domain, schemas, services, repositories,
                          components, api (hợp đồng wire/mapper), mocks.
                          Thư mục "*-api" (admin-api, audit-api, bank-api, certifications-api,
                          cultivation-api, cycles-api, debts-api, inbox-api, personal-api…) chứa
                          màn hình và repository chế độ API.
                          api-workspace/ là workspace CRUD generic.
src/server/               Code chỉ chạy server (mọi file import "server-only")
  auth/                   session, Redis store, login ledger, cookie, CSRF, token protector, gateway (~56 file test)
  backend/                transport, endpoint catalog, request/response, DTO projection
  config/                 backend-config, web-session-config
  employees/ farming/ operations/ workspace/ zones/   handler + "plan" BFF theo khu vực
  verification/           dịch vụ flow G2 và Redis flow store
  public/                 fetch provenance QR và proxy ảnh
src/shared/               downloads (zip), format (date-only), http (api-client, api-problem, map-api-error),
                          messages (catalog), mocks (backend mock trong bộ nhớ), presentation,
                          security (chính sách mật khẩu), session (expiry channel)
scripts/                  script kiểm chứng/QA (xem 07); scripts/lib/check-sidebar-styles.mjs
tests/fixtures/           8 app Next cô lập cho kiểm tra build/HTTP (không phải màn sản phẩm)
docs/                     plans, decisions, reports, testing, ai-context; docs/learning bị gitignore
.github/workflows/        ci, gitleaks, pr-title, release
public/brand/             trung-nam-oyster.webp
```

Quy mô: ~1.279 file ts/tsx; 336 file test (đếm bằng grep, khoảng 1.953 lệnh `it`/`test`). Nhiều test nhất: `src/server/auth` 56, `features/employee-management` 30, `features/auth` 17, `server/operations` 13, `features/profile` 13, `server/backend` 11, `server/employees` 10, `features/operations` 10, `server/workspace` 9, `features/api-workspace` 9.

`tests/fixtures/*` (8 app): cookie-browser, expiry-boundary, serialization, server-boundary, session-access-boundary, session-routes-boundary, session-runtime-boundary, web-config-boundary.

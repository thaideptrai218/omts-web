# 04 — BFF (`src/app/api/**/route.ts`)

## Quy ước chung
- Gần như mọi phản hồi (JSON, lỗi, nhị phân) đặt `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`, `X-Content-Type-Options: nosniff`. Ngoại lệ: route ảnh origin (`private, max-age=300`, `X-Robots-Tag: noindex`, CSP chặt) và các handler ghi `/api/auth/*` (đặt `no-store` nhưng cần kiểm lại — xem file 09).
- Nhiều GET gọi `await connection()` trước nên là dynamic.

### Luồng handler có bảo vệ
1. Kiểm `gateway.mode` ("disabled" 404 nếu không phải api).
2. Parse cấu hình backend (503 "unavailable" nếu sai).
3. Validate query/body nghiêm ngặt; khóa lạ hoặc trùng → 400 `invalid-input`.
4. Với thao tác ghi: chạy CSRF guard.
5. `gateway.resolve(cookie)`: 401 `session-expired`, 503 `unavailable`, 403 `onboarding-required` nếu phase chưa là `application`.
6. Ủy quyền: theo `subjectType`, hoặc `gateway.application()` (nạp `/me` và `/me/permissions` rồi kiểm `functionPermissions`).
7. `fetch(new URL(path, backend.origin), {credentials:"omit", redirect:"error", cache:"no-store", signal})` với `Authorization: Bearer <access>`; access token chỉ đọc bên trong BFF.
8. `readBackendResponse` (xem file 06).
9. Resolve lại phiên và bắt buộc `sameEmployeeSession(initial, current)` (cùng session hash, revision, account, backend session id, subject type, phase). Lệch → 401 `session-expired`, nên không bao giờ công bố kết quả sau khi đã đăng xuất giữa chừng.
10. Parse dữ liệu upstream bằng zod rồi chiếu (projection). Parse lỗi → 502 `invalid-response`.

- Dùng `AbortSignal.any([request.signal, timeout])`; một số ngân sách tăng: 15s cho tệp và farming, 20s cho upload và OCR.
- Lỗi trả trình duyệt: `{status:"rejected", code?:MSGxx, ...}` với HTTP status upstream. Không chuyển tiếp header, body hay nguyên nhân upstream.

## Auth và phiên (`server/auth/api-auth-http.ts`, `session-http.ts`)
| Route | Method | Backend / hành động | Kiểm tra |
| --- | --- | --- | --- |
| `/api/auth/bootstrap` | POST (không body) | Không gọi backend; tạo/đọc cookie ngữ cảnh đăng nhập và ledger; trả `ready`, `pending`, `reset-required` hoặc `active` + `revision` | CSRF |
| `/api/auth/login` | POST JSON ≤ 8192 | `POST /api/auth/login`, rồi `GET /api/me`, `GET /api/me/permissions` | CSRF; body `{identifier ≤254, password ≤128}` |
| `/api/auth/logout` | POST `{expectedRevision?: uuid}` | `POST /api/auth/logout` | CSRF; revision phải khớp ledger |
| `/api/auth/password` | POST JSON | `POST /api/me/password` | CSRF; lease ledger |
| `/api/auth/session` | GET | DTO trình duyệt gồm định danh và quyền (không có token) | 200 `authenticated`; 401 `anonymous` (kèm `clearCookie`); 403 `onboarding-required` + `destination`; 503 |
| `/api/auth/session/recover` | POST (không body) | Xóa cookie hỏng, trả đích | CSRF |

## Workspace, resource, operations
| Route | Method | Backend | Ủy quyền |
| --- | --- | --- | --- |
| `/api/workspace/[resource]` (zones, suppliers, input-items, employees, rafts, accounts, roles, customers) | GET; POST `{action,id?,zoneId?,body}` | `/api/zones`, `/api/suppliers`, `/api/farming-input-items`, `/api/employees`, `/api/accounts`, `/api/roles`, `/api/customers`, `/api/zones/{id}/rafts`, kèm `/{id}` và `/{id}/{discontinue\|reactivate\|lock\|unlock}`, `/api/farming-input-items/next-code` | `resourceAllowed(...)` (View cho đọc, Create, Edit); 403 MSG02; `proposal` chỉ Owner; lock/unlock chỉ accounts; allowlist query (page ≤7 chữ số, pageSize ≤100, search ≤200); body lọc theo danh sách trường của resource |
| `/api/operations/[area]` (26 area) | GET; POST JSON ≤64 KiB hoặc multipart | Plan ở `src/server/operations/*-plan.ts`: `/api/purchase-receipts`, `/api/supplier-payments`, `/api/zones/{id}/water-measurements`, `/api/sales-invoices`, `/api/customer-payments`, `/api/harvest-lots`, `/api/rafts/{id}/harvest-lots`, `/api/cultivation-cycles`, `/api/quality-claims`, `/api/me/purchase-requests`, `/api/workforce/*`, `/api/payroll-settings`, `/api/harvest-yield`, `/api/products`… | `operationAllowed(area, identity, permissions, action, zoneId)`; export cần thêm View; upload JPEG/PNG với giới hạn theo area; phản hồi qua `browserFiles` |
| `/api/operations/employees` | chuyển tiếp | `/api/employees`, `/api/employees/{id}`, `/api/employees/linkable-accounts` | chỉ `CooperativeOwner` |
| `/api/operations/zone-licenses`, `/api/operations/raft-details` | chuyển tiếp | `/api/zone-licenses[...]`, `/api/zones/{id}/licenses`, `/api/rafts/{id}[/condition\|/photo]` | Owner, hoặc Staff khi không owner-only |

- Tệp đi qua BFF: `/api/operations/purchase-receipts?action=invoice...`, `.../water?action=photo`, `.../harvest?action=photo`.
- Phản hồi nhị phân có `Content-Disposition` và `Content-Security-Policy: sandbox; default-src 'none'`.
- Giới hạn: export 32 MiB; ảnh và chứng nhận 11 MiB.

## Route theo miền
| Route | Method | Backend | Ủy quyền |
| --- | --- | --- | --- |
| `/api/account/profile` | GET, PUT | `/api/me/profile` | mọi người dùng đã đăng nhập, phase `application`; PUT JSON ≤16 KiB |
| `/api/account/notification-preferences` | GET, PUT | `/api/me/notification-preferences` | BFF đọc lại catalog theo loại tài khoản trước khi PUT (khóa InApp bắt buộc và Push chỉ đọc) |
| `/api/cooperative/profile` | GET, PUT | `/api/cooperative/profile` | Owner |
| `/api/cooperative/profile/logo`, `/cover-photo` | GET, POST multipart, DELETE | `/api/cooperative/profile[/logo\|/cover-photo]` | Owner; một tệp `file`; logo ≤2 MiB, cover ≤5 MiB; allowlist loại tệp; URL logo phải khớp regex an toàn; GET `version` phải bằng `rowVersion`; BFF viết lại `logoUrl` thành URL BFF |
| `/api/cooperative/certifications` | GET, POST | `/api/cooperative/certifications[/{id}]` (tạo, PUT cập nhật, DELETE `?rowVersion=`) | Owner |
| `/api/receiving-bank-account` | GET, POST | `/api/cooperative/receiving-bank-account` (PUT), `/api/banks` | Owner |
| `/api/admin/accounts` | GET, POST | `/api/admin/accounts[/{id}/{action}]` body `{reason,rowVersion}` | chỉ `SystemAdministrator` |
| `/api/audit-events` | GET | `/api/audit-events[/{id}]` | Owner |
| `/api/account-grants` | GET | `/api/accounts/{id}/grants` | Owner |
| `/api/account-grants/revoke` | POST | `/api/accounts/{a}/grants/{g}/revoke` | Owner; JSON ≤8 KiB; kiểm tra phản hồi `state==="Revoked"` |
| `/api/permission-functions`, `/api/role-impact` | GET | `/api/permission-functions`, `/api/roles/{id}/impact` | Owner |
| `/api/cultivation-cycles` | GET, POST | `/api/zones/{id}/cultivation-cycles`, `/api/rafts/{id}/cultivation-cycles`, `/api/rafts/{id}/progress`; ghi: `/api/rafts/{id}/cultivation-cycles` (bắt đầu), `/api/cultivation-cycles/{id}` (PUT/hủy) | Owner, hoặc quyền `CULTIVATION_CYCLES` (View hoặc hành động ghi) |
| `/api/cultivation-logs` | GET, POST | `/api/cultivation-cycles/{id}/cultivation-logs`, `/api/cultivation-logs/{id}[/remove]` | Owner, hoặc quyền `CULTIVATION_LOGS` |
| `/api/customer-debts` | GET | `/api/customer-debts[/export]`, `/api/customer-debts/{id}/statement`, `/api/sales-invoices/{id}` | `customerDebtAllowed` và `invoiceAllowed`; export xlsx |
| `/api/supplier-debts` | GET | `/api/supplier-debts[/export]`, `/api/supplier-debts/{id}/statement` | Owner hoặc `SUPPLIER_PAYMENTS` View; Export cần Export |
| `/api/supplier-documents` | GET, POST | `/api/suppliers/{id}[/certificates]`, `/api/files/local/supplier-certificates/...` | `resourceAllowed("suppliers", ..., View/Edit)` |
| `/api/inbox` | GET, POST | `/api/me/notifications?page&pageSize=20&unreadOnly`, `/{id}/open`, `/{id}/read`, `/read-all` | phase `application`; POST JSON ≤1 KiB; chấp nhận cả định dạng wire cũ và v2 (`inbox-wire.ts`) |
| `/api/trader-requests` | GET, POST | `/api/trader-requests?rejected=`, `/api/trader-requests/{accountId}/{action}` | Owner |
| `/api/zone-map` | GET | `/api/zones/map?includeDiscontinued=` | Owner hoặc Staff |
| `/api/verifications` | POST JSON ≤8 KiB | nhiều endpoint (xem 05, G2) | xem 05 |
| `(public)/origin/photo/route.ts` | GET (không dưới `/api`) | URL ảnh có chữ ký của backend | công khai; chỉ cùng backend origin; jpeg/png/webp; ≤8 MiB; kiểm `backendPhotoUrl` chặt |

- Trang QR `/origin/[qrToken]` gọi `/api/public/provenance/{token}` qua `server/public/origin-page-fetch.ts`; phân biệt `invalid-token`, `not-found`, `rate-limited`, `unavailable`; gỡ logo, cover, URL tệp; chỉ giữ URL ảnh qua `resolvePhotoSource`.
- `backendEndpointSchema` (`backend/backend-endpoint.ts`) là catalog tĩnh: login, identity, permissions, profileRead, profileUpdate, logout, passwordChange, employee*, farmingZoneList — chỉ `createBackendTransport` dùng cho login, ngữ cảnh phiên, employee và đọc zone. Các handler BFF khác gọi `fetch` trực tiếp với cùng cách gia cố.

# 03 — Route trang

Quyền: "Mock" gate theo `EffectivePermissionKey`; "API" gate theo `subjectType`/`functionCode`.

## (public) — công khai
| URL | File | Mục đích |
| --- | --- | --- |
| `/` | `(public)/page.tsx` | Landing OMTS, HTX Trung Nam (`features/landing`) |
| `/origin/[qrToken]` | `(public)/origin/[qrToken]/page.tsx` | Truy xuất nguồn gốc qua QR; hỗ trợ `?lang=en`; `robots` noindex/nocache; fetch không cache (BR-TRACE-05) qua `server/public/origin-page-fetch` |
| `/origin/photo` (route handler) | `(public)/origin/photo/route.ts` | Proxy ảnh lô (CSP sandbox, cache private 300s) |

## (auth)
| URL | Mục đích |
| --- | --- |
| `/login` | Mock: `LoginExperience`; API: `ApiLoginEntry`; liên kết đăng ký thương lái và khôi phục |
| `/register` | Đăng ký thương lái (OTP, `purpose=registration`); chỉ API, mock hiện thông báo |
| `/recover` | Khôi phục tài khoản (mock `RecoveryExperience`; API verification `purpose=recovery`) |
| `/onboarding/password` | Đổi mật khẩu tạm (Staff lần đầu) — phiên đang onboarding |
| `/onboarding/contact` | Xác minh SĐT/email sau đăng nhập |
| `/session/recover` | Dọn phiên hỏng (`InvalidSessionRecovery`) |

## (app) — có bảo vệ
Layout `(app)/layout.tsx` bọc `ServerApplicationBoundary`, quyết định: render / chuyển login / onboarding / service-unavailable (`server/auth/protected-access-decision.ts`).

| URL | Mục đích | Quyền |
| --- | --- | --- |
| `/dashboard` | Mock `DashboardExperience`; API `ApiWorkspaceHome` | Mock `workspace.overview.view`; API mọi subjectType |
| `/farming/zones` | Vùng nuôi | Mock `farming.zones.view`; API Owner hoặc Staff (View mặc định) |
| `/farming/rafts` | Bè nuôi | Mock `farming.rafts.view`; API như trên |
| `/farming/cycles` | Chu kỳ nuôi (`cycles-api`) | API `CULTIVATION_CYCLES`; mock không có menu |
| `/workspace/[resource]` | Danh mục: `zones, suppliers, input-items, employees, rafts, accounts, roles, customers`; chỉ API (mock 404) | `resourceAllowed` |
| `/operations/[area]` | 26 area — xem [04](04-operations-areas.md); mock chỉ `workforce`, `purchase-receipts`, `supplier-payments` | `operationAllowed` |
| `/operations/purchase-requests/[id]` | Chi tiết yêu cầu mua; Trader xem `TraderRequestDetailPage`, Owner/Staff xem `PurchaseRequestReviewDetail` | Trader, Owner, Staff có `PURCHASE_REQUESTS` |
| `/operations/supplier-debts` | Đối chiếu công nợ NCC (`debts-api`) | Owner hoặc `SUPPLIER_PAYMENTS` View |
| `/operations/customer-debts` | Công nợ khách hàng; mock 404 | `customerDebtAllowed`: Owner hoặc Staff có `CUSTOMER_DEBTS` |
| `/employees` | Nhân viên thời vụ | Mock `cooperative.employees.manage`; API Owner |
| `/access/accounts` | Tài khoản nhân viên nội bộ | Mock `access.accounts.manage`; API Owner |
| `/access/roles` | Vai trò và quyền (API chỉ đọc, `editable:false`) | Mock `access.roles.manage`; API Owner |
| `/cooperative/profile` | Hồ sơ HTX | Mock `cooperative.profile.manage`; API Owner |
| `/cooperative/certifications` | Chứng nhận HTX | Owner |
| `/cooperative/receiving-bank-account` | Tài khoản ngân hàng nhận tiền (VietQR); mock báo cần API | Owner |
| `/audit` | Nhật ký thao tác (`audit-api`) | Owner |
| `/trader-requests` | Duyệt/từ chối đăng ký thương lái; mock báo cần API | Owner |
| `/notifications`, `/notifications/[id]` | Hộp thư; query `page`, `unreadOnly` | Mọi phiên API |
| `/account` | Hồ sơ cá nhân | Mọi phiên |
| `/account/security` | Tab Bảo mật (đổi mật khẩu) của `PersonalApiScreen` | Mọi phiên API |
| `/system/accounts` | SysAdmin: tài khoản, khóa/mở khóa, nhật ký (`admin-api`) | Chỉ SysAdmin |
| `/system/cooperatives/new` | Khởi tạo HTX + credential Owner; API hiện "không có quyền" | Mock `platform.cooperative.provision` |

## BFF route (30 route handler dưới `src/app/api`)
`auth/{login,logout,bootstrap,password,session,session/recover}`, `workspace/[resource]`, `operations/[area]`, `account/{profile,notification-preferences}`, `account-grants`, `admin/accounts`, `audit-events`, `cooperative/{profile,logo,cover-photo,certifications}`, `receiving-bank-account`, `cultivation-cycles`, `cultivation-logs`, `customer-debts`, `supplier-debts`, `supplier-documents`, `inbox`, `permission-functions`, `role-impact`, `trader-requests`, `verifications`, `zone-map`. Chi tiết proxy: [`../architecture/04-bff-routes.md`](../architecture/04-bff-routes.md).

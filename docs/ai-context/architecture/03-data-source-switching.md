# 03 — Chuyển đổi nguồn dữ liệu (mock ↔ API)

## Biến môi trường và parse
- `OMTS_DATA_SOURCE` = `mock` | `api`. Chỉ phía server; biến `NEXT_PUBLIC_*` tương ứng bị từ chối bằng `z.never()`.
- Parse tại `src/server/config/backend-config.ts` bằng `parseServerBackendConfig(env)`; hàm không tự đọc `process.env`, nơi gọi truyền env vào.
- Mock: trả `{source:"mock"}`; đặt `OMTS_API_BASE_URL` hoặc `OMTS_API_TIMEOUT_MS` trong mock là cấu hình sai.
- API: `OMTS_API_BASE_URL` phải là **origin thuần** (không path, query, credential, `%`, `@`), https hoặc http loopback và không ở production; `OMTS_API_TIMEOUT_MS` bắt buộc, 1–60000.
- Kết quả `{status:"valid", config}` hoặc `{status:"invalid-config", fields}` — chỉ có tên trường, không có giá trị.

## Chuyển ở thời điểm chạy (không có công tắc lúc build)
- `server/auth/session-gateway.ts`: `mode = source.status !== "valid" ? "unavailable" : source.config.source`.
- `getSessionGateway()` (`session-gateway.instance.ts`) tạo lười từ `{...process.env}` và cache theo worker; import route lúc build không mở Redis.
- Trang chọn chế độ sau `await connection()`:
  - `features/api-workspace/api-page.tsx`: `mode==="mock" ? children : api`.
  - `features/auth/components/server-application-boundary.tsx`: mock render `AppSessionShell`; API render `requireApplicationPage()` và `ApiWorkspaceShell`.
  - `app/layout.tsx`: `<AuthProvider enabled={mode==="mock"}>`.
  - login, register, recover, onboarding cũng rẽ nhánh theo chế độ.
- Ở chế độ `mock`, các handler `/api/*` trả 404 `{status:"disabled"}`.
- Biến phụ: `NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2` đổi plan/quyền purchasing lúc build; `NEXT_PUBLIC_VIETMAP_API_KEY` là khóa bản đồ phía trình duyệt.

## Mẫu repository
Component → service → repository interface → adapter mock hoặc API.

Ví dụ `features/employee-management/repositories/employee-management-repository.ts`:
`interface EmployeeManagementRepository { load; save; unlinkAccount; endEmployment; reinstate; createLoginAccount }`. Adapter mock: `mock-employee-management-repository.ts`; instance: `services/employee-management-service.instance.ts` nối `new EmployeeManagementService(mockManagementEnvironment.employees)`. Trạng thái mock dùng chung qua `src/shared/mocks/*.instance.ts`. Auth cùng mẫu: `AuthRepository` + `auth-service.instance.ts`.

Adapter API là repository `fetch` gọi BFF, không bao giờ gọi backend trực tiếp:
- `features/api-workspace/workspace-repository.ts` — `createWorkspaceRepository(resource)` gọi `/api/workspace/<resource>`.
- `features/operations/repository.ts` — `createOperationsRepository(area)` gọi `/api/operations/<area>`.
- `singleton-repository.ts` và `*-api/repository.ts` ở các feature khác.
- Cả hai repository gửi `credentials:"same-origin"`, `cache:"no-store"`, `redirect:"error"`; thao tác ghi thêm header `X-OMTS-Request: web`.

Màn API dùng lại cùng file route qua `ApiPage`. Ví dụ `app/(app)/employees/page.tsx`:
```tsx
<ApiPage api={<ApiResourceScreen resource="employees" />}><EmployeeManagementExperience /></ApiPage>
```
Quy tắc `AGENTS.md`: component không gọi storage mock hay HTTP trực tiếp.
